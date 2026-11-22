import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { verifyAgainstDummy, verifyPassword } from "@/lib/adminCrypto"
import { GENERIC_AUTH_ERROR, clearExpiredLock, isLocked, normalizeEmail, registerAuthFailure } from "@/lib/adminAuth"
import {
  adminJson,
  adminUnavailable,
  checkAdminOrigin,
  clientIp,
  logAudit,
  requireSessionSecret,
  setAdminPendingCookie,
} from "@/lib/adminSession"
import { enforceAdminAuthRateLimit } from "@/lib/ratelimit"
import { createHash } from "crypto"

// Ismeretlen usernél a lejárt-zárolás nullázás (egy további DB-művelet) helyett ez az olvasás fut le.
const DUMMY_LOOKUP_EMAIL = "dummy-lookup@invalid.invalid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(256),
})

// 1. lépés: e-mail + jelszó. Siker esetén csak "2FA függőben" cookie (admin_pending) készül.
// MINDEN hiba (ismeretlen felhasználó, rossz jelszó, zárolt/inaktív fiók, hiányzó 2FA) ugyanazt a választ adja.
export async function POST(req: NextRequest) {
  if (!checkAdminOrigin(req)) return adminJson({ error: "Érvénytelen kérés." }, 403)

  const secret = requireSessionSecret()
  if (!secret) return adminUnavailable()

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return adminJson({ error: GENERIC_AUTH_ERROR }, 400)
  }

  const email = normalizeEmail(body.email)
  const ip = clientIp(req)

  const limited = await enforceAdminAuthRateLimit(
    "login",
    ip,
    createHash("sha256").update(email).digest("hex")
  )
  if (limited) return limited

  let user
  try {
    user = await prisma.adminUser.findUnique({ where: { email } })
    if (user) user = await clearExpiredLock(user)
    else await prisma.adminUser.findUnique({ where: { email: DUMMY_LOOKUP_EMAIL } }) // időzítés: ismeretlen usernél is egy további olvasás
  } catch (error) {
    console.error("Admin login DB hiba:", error instanceof Error ? error.name : "ismeretlen")
    return adminUnavailable()
  }

  // Nem létező felhasználónál is lefut egy scrypt (dummy hash) → közel azonos válaszidő
  const passwordOk = user
    ? await verifyPassword(body.password, user.passwordHash)
    : await verifyAgainstDummy(body.password)

  const locked = !!user && isLocked(user)
  const eligible = !!user && user.isActive && !!user.totpEnabledAt && !locked

  if (!user || !passwordOk || !eligible) {
    // Zárolt fiókon a hiba nem növeli (és nem hosszabbítja) a zárolást
    if (user && user.isActive && !locked && !passwordOk) {
      await registerAuthFailure(user.id)
    }
    await logAudit({
      adminId: user?.id ?? null,
      action: "LOGIN_FAILED",
      ip,
      details: {
        step: "password",
        reason: !user
          ? "unknown_user"
          : locked
            ? "locked"
            : !user.isActive
              ? "inactive"
              : !passwordOk
                ? "bad_password"
                : "no_2fa",
      },
    })
    return adminJson({ error: GENERIC_AUTH_ERROR }, 401)
  }

  const res = adminJson({ ok: true, next: "/admin/login/2fa" })
  await setAdminPendingCookie(res, user.id, secret)
  return res
}
