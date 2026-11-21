import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  AdminCryptoConfigError,
  decryptTotpSecret,
  getTotpEncKey,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "@/lib/adminCrypto"
import { GENERIC_AUTH_ERROR, isLocked, registerAuthFailure } from "@/lib/adminAuth"
import { verifyTotp } from "@/lib/totp"
import {
  ADMIN_PENDING_COOKIE,
  adminJson,
  adminUnavailable,
  checkAdminOrigin,
  clearAdminCookie,
  clientIp,
  logAudit,
  readTokenAdminId,
  requireSessionSecret,
  setAdminSessionCookie,
} from "@/lib/adminSession"
import { enforceAdminAuthRateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({ code: z.string().trim().min(6).max(16) })

// 2. lépés: 6 jegyű TOTP VAGY helyreállító kód (XXXX-XXXX). Érvényes admin_pending cookie kell.
// A hibaüzenet nem árulja el, hogy a jelszó vagy a kód volt-e rossz.
export async function POST(req: NextRequest) {
  if (!checkAdminOrigin(req)) return adminJson({ error: "Érvénytelen kérés." }, 403)

  const secret = requireSessionSecret()
  if (!secret) return adminUnavailable()
  try {
    getTotpEncKey()
  } catch (error) {
    console.error(error instanceof AdminCryptoConfigError ? error.message : "ADMIN_TOTP_ENC_KEY hiba")
    return adminUnavailable()
  }

  const adminId = await readTokenAdminId(req.cookies.get(ADMIN_PENDING_COOKIE)?.value, "pending")
  if (!adminId) {
    return adminJson({ error: "A bejelentkezés lejárt, kérjük jelentkezzen be újra.", code: "expired" }, 401)
  }

  let rawCode: string
  try {
    rawCode = bodySchema.parse(await req.json()).code
  } catch {
    return adminJson({ error: GENERIC_AUTH_ERROR }, 400)
  }

  // Kódtípus felismerése hossz/formátum alapján (6 számjegy → TOTP, 8 karakter → helyreállító kód)
  const totpDigits = /^\d{3}\s?\d{3}$/.test(rawCode) ? rawCode.replace(/\s/g, "") : null
  const recoveryCode = totpDigits ? null : normalizeRecoveryCode(rawCode)
  if (!totpDigits && !recoveryCode) return adminJson({ error: GENERIC_AUTH_ERROR }, 400)

  const ip = clientIp(req)
  const limited = await enforceAdminAuthRateLimit("2fa", ip, adminId)
  if (limited) return limited

  let user
  try {
    user = await prisma.adminUser.findUnique({ where: { id: adminId } })
  } catch (error) {
    console.error("Admin 2FA DB hiba:", error instanceof Error ? error.name : "ismeretlen")
    return adminUnavailable()
  }

  const fail = async (reason: string, countFailure: boolean) => {
    let locked = false
    if (user && countFailure) locked = (await registerAuthFailure(user.id)).locked
    await logAudit({ adminId: user?.id ?? adminId, action: "2FA_FAILED", ip, details: { reason } })
    const res = adminJson({ error: GENERIC_AUTH_ERROR }, 401)
    if (locked || !user) clearAdminCookie(res, ADMIN_PENDING_COOKIE)
    return res
  }

  if (!user || !user.isActive || !user.totpEnabledAt) return fail("not_eligible", false)
  if (isLocked(user)) return fail("locked", false)

  const now = new Date()
  let method: "totp" | "recovery"
  let recoveryLeft: number | undefined

  if (totpDigits) {
    method = "totp"
    let totpSecret: Buffer
    try {
      totpSecret = decryptTotpSecret(user.totpSecretEnc)
    } catch (error) {
      console.error("TOTP-titok visszafejtési hiba (rossz ADMIN_TOTP_ENC_KEY?):", error instanceof Error ? error.name : "ismeretlen")
      return adminUnavailable()
    }
    const result = verifyTotp(totpSecret, totpDigits, { lastStep: user.lastTotpStep })
    if (!result.ok) return fail("bad_code", true)

    // Atomikus újrajátszás-védelem: csak akkor frissül, ha a lépés még nagyobb a mentettnél
    const updated = await prisma.adminUser.updateMany({
      where: { id: user.id, OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: result.step } }] },
      data: { lastTotpStep: result.step, failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    })
    if (updated.count !== 1) return fail("replayed_code", true)
  } else {
    method = "recovery"
    let codeHash: string
    try {
      codeHash = hashRecoveryCode(recoveryCode as string)
    } catch (error) {
      console.error(error instanceof AdminCryptoConfigError ? error.message : "Helyreállító kód hash hiba")
      return adminUnavailable()
    }
    // Atomikus egyszeri felhasználás
    const used = await prisma.adminRecoveryCode.updateMany({
      where: { adminUserId: user.id, codeHash, usedAt: null },
      data: { usedAt: now },
    })
    if (used.count !== 1) return fail("bad_code", true)

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    })
    recoveryLeft = await prisma.adminRecoveryCode.count({ where: { adminUserId: user.id, usedAt: null } })
  }

  await logAudit({ adminId: user.id, action: "LOGIN", ip, details: { method } })

  const res = adminJson({ ok: true, next: "/admin", ...(recoveryLeft !== undefined ? { recoveryCodesLeft: recoveryLeft } : {}) })
  await setAdminSessionCookie(res, user.id, secret)
  clearAdminCookie(res, ADMIN_PENDING_COOKIE)
  return res
}
