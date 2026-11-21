// Két globális tanú a meghatalmazáson. Az aláírás-kép a privát Supabase Storage "signatures"
// bucketben van (kulcs: witnesses/<witnessId>/signature.png); a DB-ben csak a kulcs.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { prisma } from "./db"
import {
  WitnessError,
  decodeDrawnDataUrl,
  processSignatureImage,
  validateUploadedImage,
} from "./signatureImage"

export { WitnessError }

const BUCKET = "signatures"
const WITNESS_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/
const KEY_REGEX = /^witnesses\/[A-Za-z0-9_-]{1,64}\/signature\.png$/

export interface WitnessRow {
  id: string
  name: string
  address: string
  signatureKey: string
  sortOrder: number
  isActive: boolean
}

/** A lezáráskor a DamageReport.witnessSnapshot JSON-ba kerülő bejegyzés. */
export interface WitnessSnapshotEntry {
  id: string
  name: string
  address: string
  signatureKey: string
}

// Service-role kliens (csak szerveroldalon); lustán jön létre, hogy az import ne igényeljen env-et
let adminClient: SupabaseClient | null = null
function storageAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new WitnessError("A tárhely (Supabase Storage) nincs beállítva.")
    adminClient = createClient(url, key)
  }
  return adminClient
}

/** Aktív tanúk sortOrder szerint. */
export async function getActiveWitnesses(): Promise<WitnessRow[]> {
  const rows = await prisma.witness.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    address: w.address,
    signatureKey: w.signatureKey,
    sortOrder: w.sortOrder,
    isActive: w.isActive,
  }))
}

/** Pontosan 2 aktív tanút ad vissza, különben WitnessError. */
export async function requireTwoActiveWitnesses(): Promise<[WitnessRow, WitnessRow]> {
  const active = await getActiveWitnesses()
  if (active.length !== 2) {
    throw new WitnessError("A meghatalmazások csak 2 aktív tanúval készíthetők")
  }
  return [active[0], active[1]]
}

export function toSnapshot(witnesses: WitnessRow[]): WitnessSnapshotEntry[] {
  return witnesses.map(({ id, name, address, signatureKey }) => ({ id, name, address, signatureKey }))
}

/** Az aláírás PNG-je data URL-ként (PDF-hez); hiányzó/olvashatatlan kép esetén WitnessError. */
export async function loadWitnessSignatureDataUrl(signatureKey: string): Promise<string> {
  if (!KEY_REGEX.test(signatureKey)) {
    throw new WitnessError("A tanú aláírásának azonosítója érvénytelen.")
  }
  const { data, error } = await storageAdmin().storage.from(BUCKET).download(signatureKey)
  if (error || !data) {
    throw new WitnessError(
      "A tanú aláírás-képe nem található vagy nem tölthető be. Töltsd fel újra az admin felületen."
    )
  }
  const buffer = Buffer.from(await data.arrayBuffer())
  if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50) {
    throw new WitnessError("A tanú aláírás-képe sérült. Töltsd fel újra az admin felületen.")
  }
  return `data:image/png;base64,${buffer.toString("base64")}`
}

/**
 * Aláírás mentése: rajzolt PNG data URL VAGY feltöltött kép (PNG/JPG, max 2 MB). Szerveren
 * feldolgozva (tartalomra vágás, átlátszó háttér, ~600 px szélesség, max 200 KB), a privát
 * bucketbe mentve. Visszaadja a Storage kulcsot.
 */
export async function saveWitnessSignature(input: {
  witnessId: string
  dataUrl?: string
  imageBytes?: Uint8Array
  mimeType?: string
}): Promise<string> {
  if (!WITNESS_ID_REGEX.test(input.witnessId)) throw new WitnessError("Érvénytelen tanú-azonosító.")

  let source: Uint8Array
  if (input.dataUrl) {
    source = decodeDrawnDataUrl(input.dataUrl)
  } else if (input.imageBytes) {
    validateUploadedImage(input.imageBytes, input.mimeType)
    source = input.imageBytes
  } else {
    throw new WitnessError("Adj meg aláírást: rajzold meg, vagy tölts fel képet.")
  }

  const png = await processSignatureImage(source)
  const key = `witnesses/${input.witnessId}/signature.png`
  const { error } = await storageAdmin().storage.from(BUCKET).upload(key, png, {
    contentType: "image/png",
    upsert: true,
  })
  if (error) throw new WitnessError(`Az aláírás mentése nem sikerült: ${error.message}`)
  return key
}

export async function deleteWitnessSignature(signatureKey: string): Promise<void> {
  if (!KEY_REGEX.test(signatureKey)) throw new WitnessError("A tanú aláírásának azonosítója érvénytelen.")
  const { error } = await storageAdmin().storage.from(BUCKET).remove([signatureKey])
  if (error) throw new WitnessError(`Az aláírás törlése nem sikerült: ${error.message}`)
}
