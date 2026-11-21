// PATCH /api/admin/kitoltesek/[id] — admin szerkesztés optimista zárolással.
// Törzs: { updatedAt: ISO (az űrlap betöltésekor kapott érték), regenerate?: boolean, data: {...mezők} }
import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import { badRequest, busy, isValidId, notFound, readJsonBody, serverError } from "@/lib/adminApi"
import { withLock } from "@/lib/adminLocks"
import { buildEditUpdateData, pickEditSchema } from "@/lib/editReportData"
import { computeFieldDiff } from "@/lib/adminDiff"
import { finalizeReport } from "@/lib/finalize"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z
  .object({
    updatedAt: z.string().datetime({ message: "Hiányzó vagy érvénytelen módosítási időbélyeg" }),
    regenerate: z.boolean().optional(),
    data: z.record(z.unknown()),
  })
  .strict()

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return notFound()

  try {
    const body = bodySchema.safeParse(await readJsonBody(req, 2_000_000))
    if (!body.success) return badRequest("Érvénytelen kérés.")
    const { updatedAt: clientUpdatedAt, regenerate, data } = body.data
    const expected = new Date(clientUpdatedAt)

    const locked = await withLock(`report:${params.id}`, async () => {
      const report = await prisma.damageReport.findUnique({ where: { id: params.id } })
      if (!report) return notFound()

      // Gyors ellenőrzés (az atomikus feltétel lent van); egyértelmű üzenet a kliensnek
      const conflict = () =>
        adminJson(
          {
            error:
              "A kitöltést közben valaki módosította (vagy egy művelet frissítette). A mentés nem történt meg — töltsd újra az oldalt, és vidd át újra a módosításaidat.",
            code: "conflict",
          },
          409
        )
      if (report.updatedAt.getTime() !== expected.getTime()) return conflict()

      const parsed = pickEditSchema(report, data).safeParse(data)
      if (!parsed.success) {
        return adminJson({ error: "Érvénytelen adatok", details: parsed.error.flatten().fieldErrors }, 400)
      }

      const updateData = buildEditUpdateData(parsed.data)
      const after: Record<string, unknown> = { ...report }
      for (const [k, v] of Object.entries(updateData)) if (v !== undefined) after[k] = v
      const changes = computeFieldDiff(report as unknown as Record<string, unknown>, after)

      let newUpdatedAt = report.updatedAt
      if (changes.length > 0) {
        // Atomikus: csak akkor ír, ha a rekord az űrlap betöltése óta nem változott
        const result = await prisma.damageReport.updateMany({
          where: { id: report.id, updatedAt: expected },
          data: updateData,
        })
        if (result.count === 0) return conflict()

        await logAudit({
          adminId: admin.adminId,
          action: "REPORT_EDIT",
          reportId: report.id,
          details: { changes },
          ip: clientIp(req),
        })
      }

      let regenerated = false
      let regenerateNote: string | undefined
      let regenerateError: string | undefined
      if (regenerate) {
        if (report.status !== "COMPLETED") {
          regenerateNote =
            "A dokumentumok újragenerálása csak lezárt (COMPLETED) kitöltésnél lehetséges; ennél az állapotnál használd az „Újrapróbálás” műveletet a részletek oldalon."
        } else {
          const outcome = await finalizeReport(report.id, { force: true, emails: { customer: false, workshop: false } })
          regenerated = outcome.ok
          await logAudit({
            adminId: admin.adminId,
            action: outcome.ok ? "REPORT_REGENERATE" : "REPORT_REGENERATE_FAILED",
            reportId: report.id,
            details: outcome.ok
              ? { emails: { customer: false, workshop: false }, via: "edit" }
              : { via: "edit", error: outcome.error.slice(0, 300) },
            ip: clientIp(req),
          })
          if (!outcome.ok) regenerateError = outcome.error
        }
      }

      const fresh = await prisma.damageReport.findUnique({ where: { id: report.id }, select: { updatedAt: true } })
      newUpdatedAt = fresh?.updatedAt ?? newUpdatedAt

      return adminJson({
        ok: true,
        unchanged: changes.length === 0,
        changedFields: changes.map((c) => c.field),
        regenerated,
        regenerateNote,
        regenerateError,
        updatedAt: newUpdatedAt.toISOString(),
      })
    })

    return locked.busy ? busy() : locked.value
  } catch (error) {
    console.error("Admin szerkesztési hiba:", error instanceof Error ? error.name : "ismeretlen")
    return serverError()
  }
}
