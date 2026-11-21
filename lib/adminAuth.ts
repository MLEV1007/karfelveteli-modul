// Közös bejelentkezési logika: sorozatos hiba számláló + zárolás (a jelszó- és a 2FA-lépés KÖZÖS számlálót használ).
import { prisma } from "./db"

export const MAX_FAILED_LOGINS = 5
export const LOCK_MINUTES = 15
export const GENERIC_AUTH_ERROR = "Hibás adatok"

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function shouldLock(failedCount: number): boolean {
  return failedCount >= MAX_FAILED_LOGINS
}

export function lockUntil(now: number = Date.now()): Date {
  return new Date(now + LOCK_MINUTES * 60 * 1000)
}

export function isLocked(user: { lockedUntil: Date | null }, now: number = Date.now()): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > now
}

/** Hiba regisztrálása (atomikus növelés); a határ elérésekor 15 percre zárol. Visszaadja, hogy zárolt-e most. */
export async function registerAuthFailure(adminId: string): Promise<{ locked: boolean }> {
  try {
    const updated = await prisma.adminUser.update({
      where: { id: adminId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    })
    if (shouldLock(updated.failedLoginCount)) {
      await prisma.adminUser.update({ where: { id: adminId }, data: { lockedUntil: lockUntil() } })
      return { locked: true }
    }
  } catch (error) {
    console.error("Sikertelen bejelentkezés számláló hiba:", error instanceof Error ? error.name : "ismeretlen")
  }
  return { locked: false }
}
