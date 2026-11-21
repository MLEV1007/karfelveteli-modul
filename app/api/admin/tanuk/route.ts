// GET  /api/admin/tanuk — tanúk listája (aláírás-előnézet 5 perces signed URL-lel)
// POST /api/admin/tanuk — új tanú (multipart: name, address, isActive?, signatureDataUrl VAGY signatureFile)
import { NextRequest } from "next/server"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import { AdminWitnessError, createWitness, listAdminWitnesses } from "@/lib/adminWitnesses"
import { parseWitnessForm } from "@/lib/adminWitnessRequest"
import { withLock } from "@/lib/adminLocks"

export const dynamic = "force-dynamic"

function handleError(error: unknown) {
  if (error instanceof AdminWitnessError) return adminJson({ error: error.message }, error.status)
  console.error("Admin tanú hiba:", error instanceof Error ? error.name : "ismeretlen")
  return adminJson({ error: "Váratlan hiba történt. Próbáld újra később." }, 500)
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  try {
    return adminJson(await listAdminWitnesses())
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  try {
    const form = await parseWitnessForm(req)
    const locked = await withLock("witnesses", () =>
      createWitness({ name: form.name, address: form.address, isActive: form.isActive, signature: form.signature })
    )
    if (locked.busy) return adminJson({ error: "Egy másik tanú-művelet még fut, próbáld újra." }, 409)
    const w = locked.value
    // Az auditnapló aláírás-adatot nem tartalmaz
    await logAudit({
      adminId: admin.adminId,
      action: "WITNESS_CREATE",
      details: { witnessId: w.id, name: w.name, address: w.address, isActive: w.isActive },
      ip: clientIp(req),
    })
    return adminJson({ ok: true, id: w.id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
