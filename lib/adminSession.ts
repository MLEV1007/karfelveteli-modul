// Admin session és védelmi segédfüggvények. Az /admin/** és /api/admin/** útvonalakat
// (kivéve /admin/login*, /admin/munkalap/*, /api/admin/auth/*) csak teljes admin session éri el.
//
// Két aláírt (HMAC-SHA256, ADMIN_SESSION_SECRET) cookie:
//  - admin_pending: jelszó utáni "2FA függőben" állapot, 5 perc, csak az adminId-t hordozza
//  - admin_session: teljes session, 8 óra, HttpOnly, Secure (prodban), SameSite=Lax, path=/
// A session MINDEN használatkor DB-ből is ellenőrzi, hogy az AdminUser létezik és isActive.
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { prisma } from "./db"
import { checkMutationOrigin } from "./adminCsrf"
import {
  ADMIN_PENDING_COOKIE,
  ADMIN_PENDING_TTL_SECONDS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminSecretProblem,
  getAdminSessionSecret,
  verifyAdminToken,
  signAdminToken,
} from "./adminToken"

export interface AdminIdentity {
  adminId: string
  email: string
  name: string
}

export { ADMIN_PENDING_COOKIE, ADMIN_SESSION_COOKIE }

const NO_STORE = { "Cache-Control": "no-store" }

/** JSON válasz no-store fejléccel (admin válaszok nem cache-elhetők). */
export function adminJson(body: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } })
}

let secretProblemLogged = false

/** Az aláíró titok, vagy null (és érthető szerver-oldali log, egyszer), ha hiányzik / túl rövid. */
export function requireSessionSecret(): string | null {
  const secret = getAdminSessionSecret()
  if (!secret) {
    if (!secretProblemLogged) {
      secretProblemLogged = true
      const problem = adminSecretProblem()
      console.error(
        problem === "too_short"
          ? "ADMIN_SESSION_SECRET túl rövid (min. 32 bájt) — az admin bejelentkezés le van tiltva. Generálás: openssl rand -hex 32"
          : "ADMIN_SESSION_SECRET hiányzik — az admin bejelentkezés le van tiltva. Generálás: openssl rand -hex 32"
      )
    }
    return null
  }
  return secret
}

export function adminUnavailable(): NextResponse {
  return adminJson({ error: "A szolgáltatás átmenetileg nem elérhető." }, 503)
}

/** Mutáló metódusnál az Origin fejléc ellenőrzése (CSRF). Nem mutálónál mindig true. */
export function checkAdminOrigin(req: NextRequest): boolean {
  return checkMutationOrigin(req.method, req.headers, process.env.NEXT_PUBLIC_APP_URL)
}

export function adminCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export async function setAdminSessionCookie(res: NextResponse, adminId: string, secret: string) {
  const value = await signAdminToken("session", adminId, secret)
  res.cookies.set(ADMIN_SESSION_COOKIE, value, adminCookieOptions(ADMIN_SESSION_TTL_SECONDS))
}

export async function setAdminPendingCookie(res: NextResponse, adminId: string, secret: string) {
  const value = await signAdminToken("pending", adminId, secret)
  res.cookies.set(ADMIN_PENDING_COOKIE, value, adminCookieOptions(ADMIN_PENDING_TTL_SECONDS))
}

export function clearAdminCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { ...adminCookieOptions(0), maxAge: 0 })
}

/** Aláírás + lejárat ellenőrzése, DB-hívás nélkül. Visszaadja az adminId-t. */
export async function readTokenAdminId(
  cookieValue: string | undefined,
  kind: "pending" | "session"
): Promise<string | null> {
  const secret = getAdminSessionSecret()
  if (!secret) return null
  const verified = await verifyAdminToken(cookieValue, kind, secret)
  return verified?.adminId ?? null
}

/** DB-ellenőrzés: létezik, aktív és a 2FA be van kapcsolva. Hibánál dob (a hívó dönt). */
async function loadActiveAdmin(adminId: string): Promise<AdminIdentity | null> {
  const user = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, isActive: true, totpEnabledAt: true },
  })
  if (!user || !user.isActive || !user.totpEnabledAt) return null
  return { adminId: user.id, email: user.email, name: user.name }
}

/** API route handlerekhez: érvényes admin session + (mutáló kérésnél) Origin ellenőrzés.
 *  Siker: AdminIdentity. Hiba: kész NextResponse (401/403/503), amit a handler visszaad. */
export async function requireAdminApi(req: NextRequest): Promise<AdminIdentity | NextResponse> {
  const secret = requireSessionSecret()
  if (!secret) return adminUnavailable()

  if (!checkAdminOrigin(req)) {
    return adminJson({ error: "Érvénytelen kérés." }, 403)
  }

  const token = await verifyAdminToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value, "session", secret)
  if (!token) return adminJson({ error: "Nincs bejelentkezve." }, 401)

  try {
    const identity = await loadActiveAdmin(token.adminId)
    if (!identity) return adminJson({ error: "Nincs bejelentkezve." }, 401)
    return identity
  } catch (error) {
    console.error("Admin session DB-ellenőrzési hiba:", error instanceof Error ? error.name : "ismeretlen")
    return adminUnavailable()
  }
}

/** Érvényes admin identitás a cookie-ból (nem irányít át); null, ha nincs/érvénytelen. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const cookie = cookies().get(ADMIN_SESSION_COOKIE)?.value
  if (!cookie) return null
  const adminId = await readTokenAdminId(cookie, "session")
  if (!adminId) return null
  try {
    return await loadActiveAdmin(adminId)
  } catch (error) {
    console.error("Admin session DB-ellenőrzési hiba:", error instanceof Error ? error.name : "ismeretlen")
    return null
  }
}

/** Szerver oldali oldalakhoz (RSC): érvényes admin session, különben redirect("/admin/login"). */
export async function requireAdminPage(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity()
  if (!identity) redirect("/admin/login")
  return identity
}

function toJsonValue(details: unknown): Prisma.InputJsonValue | undefined {
  if (details === undefined || details === null) return undefined
  try {
    return JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue
  } catch {
    return undefined
  }
}

/** Auditnapló-bejegyzés (AdminAuditLog). Soha nem dob: hiba esetén csak naplóz (személyes adat nélkül). */
export async function logAudit(entry: {
  adminId?: string | null
  action: string
  reportId?: string | null
  details?: unknown
  ip?: string | null
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: entry.adminId ?? null,
        action: String(entry.action).slice(0, 64),
        reportId: entry.reportId ?? null,
        details: toJsonValue(entry.details),
        ip: entry.ip ? String(entry.ip).slice(0, 64) : null,
      },
    })
  } catch (error) {
    console.error("Auditnapló írási hiba:", error instanceof Error ? error.name : "ismeretlen")
  }
}

export { clientIp } from "./clientIp"
