// Tanú-kérések törzsének feldolgozása (multipart/form-data: név, lakcím, aláírás rajzolva VAGY feltöltve).
import type { NextRequest } from "next/server"
import { MAX_UPLOAD_BYTES } from "./signatureImage"
import { witnessTextSchema, AdminWitnessError, type SignatureInput } from "./adminWitnesses"

export interface ParsedWitnessForm {
  name: string
  address: string
  isActive?: boolean
  signature?: SignatureInput
}

export async function parseWitnessForm(req: NextRequest): Promise<ParsedWitnessForm> {
  const length = Number(req.headers.get("content-length") ?? 0)
  if (length > MAX_UPLOAD_BYTES + 512 * 1024) {
    throw new AdminWitnessError("A kérés túl nagy (a kép legfeljebb 2 MB lehet).", 413)
  }
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw new AdminWitnessError("Érvénytelen űrlap.")
  }

  const text = witnessTextSchema.safeParse({ name: form.get("name"), address: form.get("address") })
  if (!text.success) {
    throw new AdminWitnessError(text.error.issues[0]?.message ?? "Érvénytelen adatok.")
  }

  const rawActive = form.get("isActive")
  const isActive = rawActive === "true" ? true : rawActive === "false" ? false : undefined

  const dataUrl = form.get("signatureDataUrl")
  const file = form.get("signatureFile")
  let signature: SignatureInput | undefined
  if (typeof dataUrl === "string" && dataUrl && file instanceof File && file.size > 0) {
    throw new AdminWitnessError("Az aláírás VAGY rajzolt, VAGY feltöltött kép legyen, ne mindkettő.")
  }
  if (typeof dataUrl === "string" && dataUrl) {
    signature = { dataUrl }
  } else if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) throw new AdminWitnessError("A feltöltött kép túl nagy (legfeljebb 2 MB lehet).", 413)
    signature = { imageBytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type }
  }

  return { name: text.data.name, address: text.data.address, isActive, signature }
}
