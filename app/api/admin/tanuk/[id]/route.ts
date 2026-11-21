// PATCH  /api/admin/tanuk/[id] — multipart: név/lakcím/aláírás csere; JSON: { action: activate|deactivate|moveUp|moveDown }
// DELETE /api/admin/tanuk/[id] — törlés (csak ha egyetlen kitöltés witnessSnapshot-jában sem szerepel)
import { NextRequest } from "next/server"
import { z } from "zod"
import { adminJson, clientIp, logAudit, requireAdminApi } from "@/lib/adminSession"
import {
  AdminWitnessError,
  deleteWitness,
  moveWitnessOrder,
  setWitnessActive,
  updateWitness,
} from "@/lib/adminWitnesses"
import { parseWitnessForm } from "@/lib/adminWitnessRequest"
import { computeFieldDiff } from "@/lib/adminDiff"
import { isValidId, readJsonBody } from "@/lib/adminApi"
import { withLock } from "@/lib/adminLocks"

export const dynamic = "force-dynamic"

const actionSchema = z.object({ action: z.enum(["activate", "deactivate", "moveUp", "moveDown"]) }).strict()

function handleError(error: unknown) {
  if (error instanceof AdminWitnessError) return adminJson({ error: error.message }, error.status)
  console.error("Admin tanú hiba:", error instanceof Error ? error.name : "ismeretlen")
  return adminJson({ error: "Váratlan hiba történt. Próbáld újra később." }, 500)
}

const busyResponse = () => adminJson({ error: "Egy másik tanú-művelet még fut, próbáld újra." }, 409)
const missing = () => adminJson({ error: "A tanú nem található." }, 404)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return missing()
  const ip = clientIp(req)

  try {
    const isMultipart = (req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")

    if (isMultipart) {
      const form = await parseWitnessForm(req)
      const locked = await withLock("witnesses", () =>
        updateWitness(params.id, { name: form.name, address: form.address, signature: form.signature })
      )
      if (locked.busy) return busyResponse()
      const r = locked.value
      await logAudit({
        adminId: admin.adminId,
        action: "WITNESS_UPDATE",
        details: {
          witnessId: params.id,
          changes: computeFieldDiff(r.before, r.witness, ["name", "address"]),
          signatureReplaced: r.signatureReplaced, // csak a ténye, az aláírás-adat nélkül
        },
        ip,
      })
      return adminJson({ ok: true, signatureReplaced: r.signatureReplaced })
    }

    const body = actionSchema.safeParse(await readJsonBody(req))
    if (!body.success) return adminJson({ error: "Érvénytelen kérés." }, 400)
    const { action } = body.data

    const locked = await withLock("witnesses", async () => {
      if (action === "activate" || action === "deactivate") {
        return { kind: "active" as const, ...(await setWitnessActive(params.id, action === "activate")) }
      }
      return { kind: "move" as const, moved: await moveWitnessOrder(params.id, action === "moveUp" ? "up" : "down") }
    })
    if (locked.busy) return busyResponse()
    const result = locked.value

    if (result.kind === "active") {
      await logAudit({
        adminId: admin.adminId,
        action: action === "activate" ? "WITNESS_ACTIVATE" : "WITNESS_DEACTIVATE",
        details: { witnessId: params.id, activeCount: result.activeCount },
        ip,
      })
      return adminJson({ ok: true, activeCount: result.activeCount, warning: result.warning })
    }
    if (result.moved) {
      await logAudit({ adminId: admin.adminId, action: "WITNESS_UPDATE", details: { witnessId: params.id, move: action }, ip })
    }
    return adminJson({ ok: true, moved: result.moved })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi(req)
  if ("status" in admin) return admin
  if (!isValidId(params.id)) return missing()

  try {
    const locked = await withLock("witnesses", () => deleteWitness(params.id))
    if (locked.busy) return busyResponse()
    await logAudit({
      adminId: admin.adminId,
      action: "WITNESS_DELETE",
      details: { witnessId: params.id, wasActive: locked.value.wasActive },
      ip: clientIp(req),
    })
    return adminJson({ ok: true, warning: locked.value.storageWarning })
  } catch (error) {
    return handleError(error)
  }
}
