// POST /api/admin/kitoltesek/[id]/technikus-link — új technikusi munkalap-link kiállítása és kiküldése.
// A token SOHA nem kerül a válaszba és az auditnaplóba.
import { NextRequest } from "next/server"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import { busy, isValidId, notFound, serverError } from "@/lib/adminApi"
import { withLock } from "@/lib/adminLocks"
import { reissueTechnicianLink } from "@/lib/technicianLink"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return notFound()

  try {
    const locked = await withLock(`report:${params.id}`, () => reissueTechnicianLink(params.id))
    if (locked.busy) return busy()
    const result = locked.value

    await logAudit({
      adminId: admin.adminId,
      action: result.ok ? "TECHNICIAN_LINK_RESEND" : "TECHNICIAN_LINK_RESEND_FAILED",
      reportId: params.id,
      details: result.ok ? undefined : { code: result.code },
      ip: clientIp(req),
    })

    if (result.ok) return adminJson({ ok: true })
    if (result.code === "not_found") return notFound()
    return adminJson({ ok: false, error: result.error }, result.code === "bad_state" ? 409 : 502)
  } catch (error) {
    console.error("Admin technikusi link hiba:", error instanceof Error ? error.name : "ismeretlen")
    return serverError()
  }
}
