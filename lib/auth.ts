import { prisma } from "./db"
import type { DamageReport } from "@prisma/client"

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
