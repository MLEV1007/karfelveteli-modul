// POST /api/admin/kitoltesek/[id]/ujraprobalas — FAILED_PDF állapotú rekord véglegesítésének újrapróbálása
// (a finalize újrahívása; a szokásos lezárási út: mindkét fél megkapja a végleges e-mailt).
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import { busy, isValidId, notFound, serverError } from "@/lib/adminApi"
import { withLock } from "@/lib/adminLocks"
import { finalizeReport } from "@/lib/finalize"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return notFound()

  try {
    const locked = await withLock(`report:${params.id}`, async () => {
      const report = await prisma.damageReport.findUnique({ where: { id: params.id }, select: { id: true, status: true } })
      if (!report) return notFound()
      if (report.status !== "FAILED_PDF") {
        return adminJson({ error: "Az újrapróbálás csak PDF-hibás (FAILED_PDF) állapotú kitöltésnél lehetséges. Frissítsd az oldalt." }, 409)
      }

      const outcome = await finalizeReport(report.id)
      await logAudit({
        adminId: admin.adminId,
        action: outcome.ok ? "REPORT_RETRY" : "REPORT_RETRY_FAILED",
        reportId: report.id,
        details: outcome.ok ? undefined : { error: outcome.error.slice(0, 300) },
        ip: clientIp(req),
      })
      if (!outcome.ok) {
        return adminJson({ ok: false, error: `Az újrapróbálás ismét sikertelen volt: ${outcome.error}` }, 502)
      }
      return adminJson({ ok: true })
    })

    return locked.busy ? busy() : locked.value
  } catch (error) {
    console.error("Admin újrapróbálás hiba:", error instanceof Error ? error.name : "ismeretlen")
    return serverError()
  }
}
