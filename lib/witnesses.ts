// Két globális tanú a meghatalmazáson. Az aláírás-kép a privát Supabase Storage "signatures"
// bucketben van (kulcs: witnesses/<witnessId>/signature.png); a DB-ben csak a kulcs.
// FIGYELEM: ez a fájl egyelőre INTERFÉSZ-VÁZ — a megvalósítás a Fázis 2 agent dolga.

export class WitnessError extends Error {}

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

/** Aktív tanúk sortOrder szerint. */
export async function getActiveWitnesses(): Promise<WitnessRow[]> {
  throw new Error("not implemented")
}

/** Pontosan 2 aktív tanút ad vissza, különben WitnessError ("Nincs 2 aktív tanú"). */
export async function requireTwoActiveWitnesses(): Promise<[WitnessRow, WitnessRow]> {
  throw new Error("not implemented")
}

export function toSnapshot(witnesses: WitnessRow[]): WitnessSnapshotEntry[] {
  return witnesses.map(({ id, name, address, signatureKey }) => ({ id, name, address, signatureKey }))
}

/** Az aláírás PNG-je data URL-ként (PDF-hez); hiányzó/olvashatatlan kép esetén WitnessError. */
export async function loadWitnessSignatureDataUrl(signatureKey: string): Promise<string> {
  throw new Error("not implemented")
}

/**
 * Aláírás mentése: rajzolt PNG data URL VAGY feltöltött kép (PNG/JPG, max 2 MB). Szerveren
 * feldolgozva (tartalomra vágás, átlátszó háttér, ~600 px szélesség, max 200 KB), a privát
 * bucketbe mentve. Visszaadja az R2/Storage kulcsot.
 */
export async function saveWitnessSignature(input: {
  witnessId: string
  dataUrl?: string
  imageBytes?: Uint8Array
  mimeType?: string
}): Promise<string> {
  throw new Error("not implemented")
}

export async function deleteWitnessSignature(signatureKey: string): Promise<void> {
  throw new Error("not implemented")
}
