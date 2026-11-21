// POST /api/admin/kitoltesek/[id]/ujragenerals — a dokumentumok (PDF-ek) újragenerálása a lezáró
// (finalize) logikával; a witnessSnapshot megmarad. E-mail csak a kijelölt címzetteknek megy.
import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import { badRequest, busy, isValidId, notFound, readJsonBody, serverError } from "@/lib/adminApi"
import { withLock } from "@/lib/adminLocks"
import { finalizeReport } from "@/lib/finalize"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z
  .object({
    emails: z.object({ customer: z.boolean(), workshop: z.boolean() }).strict(),
  })
  .strict()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return notFound()

  try {
    const body = bodySchema.safeParse(await readJsonBody(req))
    if (!body.success) return badRequest()
    const { emails } = body.data

    const locked = await withLock(`report:${params.id}`, async () => {
      const report = await prisma.damageReport.findUnique({ where: { id: params.id }, select: { id: true, status: true } })
      if (!report) return notFound()
      if (report.status !== "COMPLETED") {
        return adminJson(
          {
            error:
              report.status === "FAILED_PDF"
                ? "A kitöltés PDF-hibás állapotú: használd az „Újrapróbálás” műveletet."
                : "A munkalap még nincs lezárva, nincs mit újragenerálni.",
          },
          409
        )
      }

      const outcome = await finalizeReport(report.id, { force: true, emails })
      await logAudit({
        adminId: admin.adminId,
        action: outcome.ok ? "REPORT_REGENERATE" : "REPORT_REGENERATE_FAILED",
        reportId: report.id,
        details: outcome.ok ? { emails } : { emails, error: outcome.error.slice(0, 300) },
        ip: clientIp(req),
      })
      if (!outcome.ok) {
        return adminJson({ ok: false, error: `Az újragenerálás nem sikerült: ${outcome.error}` }, 502)
      }
      return adminJson({ ok: true, emails })
    })

    return locked.busy ? busy() : locked.value
  } catch (error) {
    console.error("Admin újragenerálás hiba:", error instanceof Error ? error.name : "ismeretlen")
    return serverError()
  }
}
