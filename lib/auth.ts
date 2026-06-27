import { prisma } from "./db"
import type { DamageReport } from "@prisma/client"

/**
 * Validálja a szerkesztési tokent és visszaadja a jelentést, ha érvényes.
 * 
 * @param id - A kárfelvételi jelentés ID-ja
 * @param token - Az editToken UUID
 * @returns A DamageReport vagy null, ha érvénytelen/lejárt
 * 
 * BIZTONSÁGI MEGJEGYZÉS:
 * - Soha ne dobjon exception-t vagy specifikus hibaüzenetet
 * - Egységes null response: ne árulja el, hogy mi a hiba oka
 *   (létezik-e egyáltalán a token, vagy csak lejárt)
 */
export async function validateEditToken(
  id: string,
  token: string
): Promise<DamageReport | null> {
  try {
    // Rekord lekérése ID + token alapján
    const report = await prisma.damageReport.findUnique({
      where: {
        id,
        editToken: token,
      },
    })

    // Ha nem létezik ilyen kombináció, null
    if (!report) {
      return null
    }

    // Ha nincs lejárati dátum beállítva, null (hibás adat)
    if (!report.tokenExpiresAt) {
      return null
    }

    // Lejárat ellenőrzés
    const now = new Date()
    if (now > report.tokenExpiresAt) {
      return null
    }

    // Token érvényes
    return report
  } catch (error) {
    // Bármilyen hiba esetén egységes null válasz
    console.error("Token validation error:", error)
    return null
  }
}

/**
 * Validálja a technikusi (munkalap) tokent és visszaadja a jelentést, ha érvényes.
 *
 * @param id - A kárfelvételi jelentés ID-ja
 * @param token - A technicianToken UUID
 * @returns A DamageReport vagy null, ha érvénytelen/lejárt
 *
 * BIZTONSÁGI MEGJEGYZÉS: ugyanaz az elv, mint validateEditToken esetén —
 * egységes null response, ne árulja el a hiba okát.
 */
export async function validateTechnicianToken(
  id: string,
  token: string
): Promise<DamageReport | null> {
  try {
    const report = await prisma.damageReport.findUnique({
      where: {
        id,
        technicianToken: token,
      },
    })

    if (!report) {
      return null
    }

    if (!report.technicianTokenExpiresAt) {
      return null
    }

    const now = new Date()
    if (now > report.technicianTokenExpiresAt) {
      return null
    }

    return report
  } catch (error) {
    console.error("Technician token validation error:", error)
    return null
  }
}
