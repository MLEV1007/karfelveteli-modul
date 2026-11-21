// Technikusi munkalap-link (újra)küldése: új tokent állít ki (a régi érvénytelenné válik) a
// meglévő mechanizmus szerint (30 nap, /api/munkalap/session?id=&token=), és elküldi a
// technikusi értesítő e-mailt (sendTechnicianNotification).
import { randomUUID } from "crypto"
import { prisma } from "./db"
import { sendTechnicianNotification } from "./email"

const TECHNICIAN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type TechnicianLinkResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "bad_state" | "email_failed"; error: string }

export async function reissueTechnicianLink(reportId: string): Promise<TechnicianLinkResult> {
  const report = await prisma.damageReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, vehiclePlate: true, ownerName: true, createdAt: true },
  })
  if (!report) return { ok: false, code: "not_found", error: "A kitöltés nem található." }
  if (report.status === "COMPLETED") {
    return {
      ok: false,
      code: "bad_state",
      error: "A munkalap már le van zárva, nincs értelme új technikusi linket küldeni.",
    }
  }

  const token = randomUUID()
  // Atomikus: csak akkor cserél tokent, ha az állapot közben nem változott COMPLETED-re
  const updated = await prisma.damageReport.updateMany({
    where: { id: report.id, status: { in: ["PENDING_TECHNICIAN", "FAILED_PDF"] } },
    data: { technicianToken: token, technicianTokenExpiresAt: new Date(Date.now() + TECHNICIAN_TOKEN_TTL_MS) },
  })
  if (updated.count === 0) {
    return { ok: false, code: "bad_state", error: "A kitöltés állapota közben megváltozott. Frissítsd az oldalt." }
  }

  try {
    await sendTechnicianNotification({
      vehiclePlate: report.vehiclePlate,
      ownerName: report.ownerName,
      createdAt: report.createdAt,
      munkalapUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/munkalap/session?id=${report.id}&token=${token}`,
    })
  } catch (error) {
    console.error("Technikusi link e-mail hiba:", error instanceof Error ? error.name : "ismeretlen")
    return {
      ok: false,
      code: "email_failed",
      error: "Az új link elkészült (a régi érvénytelen), de az e-mail kiküldése nem sikerült. Próbáld újra.",
    }
  }
  return { ok: true }
}
