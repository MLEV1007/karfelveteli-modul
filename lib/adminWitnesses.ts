// Tanúk admin kezelése (szerver oldal): lista, létrehozás, módosítás, aktiválás, sorrend, törlés.
// Az üzleti szabályok tiszta része a lib/adminWitnessRules.ts-ben van. Az aláírás-kép feldolgozását és
// tárolását a lib/witnesses.ts végzi (privát "signatures" bucket).
import { randomUUID } from "crypto"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "./db"
import { saveWitnessSignature, deleteWitnessSignature, WitnessError } from "./witnesses"
import { signWitnessSignature } from "./adminStorage"
import {
  activeWitnessWarning,
  checkActivation,
  checkDeletable,
  collectReferencedWitnessIds,
  countActive,
  defaultActiveForNew,
  isWitnessReferenced,
  moveWitness,
} from "./adminWitnessRules"

export class AdminWitnessError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
    this.name = "AdminWitnessError"
  }
}

export const witnessTextSchema = z.object({
  name: z.string().trim().min(2, "Add meg a tanú nevét (legalább 2 karakter)").max(120, "A név legfeljebb 120 karakter lehet"),
  address: z.string().trim().min(3, "Add meg a tanú lakcímét").max(250, "A lakcím legfeljebb 250 karakter lehet"),
})

export interface AdminWitness {
  id: string
  name: string
  address: string
  sortOrder: number
  isActive: boolean
  /** Szerepel-e legalább egy kitöltés witnessSnapshot-jában (ekkor nem törölhető). */
  referenced: boolean
  /** 5 perces signed URL az aláírás-előnézethez (null, ha nem érhető el). */
  signatureUrl: string | null
}

export interface AdminWitnessList {
  witnesses: AdminWitness[]
  activeCount: number
  warning: string | null
}

const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }]

async function loadSnapshots(): Promise<unknown[]> {
  // Csak a snapshot-tal rendelkező rekordok; a tanú-id szerinti hivatkozás-ellenőrzés szerver oldalon,
  // tiszta függvénnyel történik (lib/adminWitnessRules.ts).
  const rows = await prisma.damageReport.findMany({
    where: { witnessSnapshot: { not: Prisma.DbNull } },
    select: { witnessSnapshot: true },
  })
  return rows.map((r) => r.witnessSnapshot)
}

export async function listAdminWitnesses(): Promise<AdminWitnessList> {
  const [rows, snapshots] = await Promise.all([prisma.witness.findMany({ orderBy: ORDER }), loadSnapshots()])
  const referenced = collectReferencedWitnessIds(snapshots)
  const witnesses: AdminWitness[] = await Promise.all(
    rows.map(async (w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      sortOrder: w.sortOrder,
      isActive: w.isActive,
      referenced: referenced.has(w.id),
      signatureUrl: await signWitnessSignature(w.signatureKey),
    }))
  )
  const activeCount = countActive(witnesses)
  return { witnesses, activeCount, warning: activeWitnessWarning(activeCount) }
}

export interface SignatureInput {
  dataUrl?: string
  imageBytes?: Uint8Array
  mimeType?: string
}

function hasSignature(s: SignatureInput | undefined): s is SignatureInput {
  return !!s && (!!s.dataUrl || !!s.imageBytes)
}

/** Serializable tranzakció ütközése (párhuzamos módosítás) → érthető 409. */
function mapDbError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    throw new AdminWitnessError("Egyidejű módosítás történt, próbáld újra.", 409)
  }
  throw error
}

function wrapWitnessError(error: unknown): never {
  if (error instanceof WitnessError) throw new AdminWitnessError(error.message, 400)
  throw error
}

export async function createWitness(input: {
  name: string
  address: string
  isActive?: boolean
  signature: SignatureInput | undefined
}): Promise<AdminWitness> {
  if (!hasSignature(input.signature)) {
    throw new AdminWitnessError("Adj meg aláírást: rajzold meg, vagy tölts fel PNG/JPG képet.")
  }
  const id = randomUUID()

  let signatureKey: string
  try {
    signatureKey = await saveWitnessSignature({ witnessId: id, ...input.signature })
  } catch (e) {
    wrapWitnessError(e)
  }

  try {
    const created = await prisma
      .$transaction(
        async (tx) => {
          const all = await tx.witness.findMany({ select: { isActive: true, sortOrder: true } })
          const active = countActive(all)
          const wantActive = input.isActive ?? defaultActiveForNew(active)
          if (wantActive && active >= 2) {
            throw new AdminWitnessError("Már 2 aktív tanú van. Előbb inaktiválj egyet, vagy vedd fel inaktívként.", 409)
          }
          const nextOrder = all.length ? Math.max(...all.map((w) => w.sortOrder)) + 1 : 0
          return tx.witness.create({
            data: { id, name: input.name, address: input.address, signatureKey, sortOrder: nextOrder, isActive: wantActive },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      .catch(mapDbError)
    return {
      id: created.id,
      name: created.name,
      address: created.address,
      sortOrder: created.sortOrder,
      isActive: created.isActive,
      referenced: false,
      signatureUrl: null,
    }
  } catch (e) {
    // A feltöltött kép ne maradjon árván, ha a rekord nem jött létre
    await deleteWitnessSignature(signatureKey).catch(() => undefined)
    throw e
  }
}

export interface WitnessUpdateResult {
  witness: { id: string; name: string; address: string }
  before: { name: string; address: string }
  signatureReplaced: boolean
}

export async function updateWitness(
  id: string,
  input: { name: string; address: string; signature?: SignatureInput }
): Promise<WitnessUpdateResult> {
  const existing = await prisma.witness.findUnique({ where: { id } })
  if (!existing) throw new AdminWitnessError("A tanú nem található.", 404)

  const replacing = hasSignature(input.signature)
  if (replacing) {
    const snapshots = await loadSnapshots()
    if (isWitnessReferenced(id, snapshots)) {
      throw new AdminWitnessError(
        "Ez a tanú már szerepel kiadott meghatalmazásban, ezért az aláírása nem cserélhető (visszamenőleg megváltoztatná az újragenerált dokumentumokat). Vegyél fel új tanút, és inaktiváld ezt.",
        409
      )
    }
    try {
      await saveWitnessSignature({ witnessId: id, ...input.signature! })
    } catch (e) {
      wrapWitnessError(e)
    }
  }

  const updated = await prisma.witness.update({ where: { id }, data: { name: input.name, address: input.address } })
  return {
    witness: { id: updated.id, name: updated.name, address: updated.address },
    before: { name: existing.name, address: existing.address },
    signatureReplaced: replacing,
  }
}

export async function setWitnessActive(id: string, active: boolean): Promise<{ activeCount: number; warning: string | null }> {
  const activeCount = await prisma
    .$transaction(
      async (tx) => {
        const all = await tx.witness.findMany({ select: { id: true, isActive: true, sortOrder: true } })
        if (active) {
          const check = checkActivation(all, id)
          if (!check.ok) throw new AdminWitnessError(check.error, check.error.includes("nem található") ? 404 : 409)
        } else if (!all.some((w) => w.id === id)) {
          throw new AdminWitnessError("A tanú nem található.", 404)
        }
        await tx.witness.update({ where: { id }, data: { isActive: active } })
        return countActive(all.map((w) => (w.id === id ? { isActive: active } : w)))
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
    .catch(mapDbError)
  return { activeCount, warning: activeWitnessWarning(activeCount) }
}

export async function moveWitnessOrder(id: string, direction: "up" | "down"): Promise<boolean> {
  return prisma
    .$transaction(
      async (tx) => {
        const all = await tx.witness.findMany({ orderBy: ORDER, select: { id: true, isActive: true, sortOrder: true } })
        if (!all.some((w) => w.id === id)) throw new AdminWitnessError("A tanú nem található.", 404)
        const next = moveWitness(all, id, direction)
        if (!next) return false
        for (const { id: wid, sortOrder } of next) {
          await tx.witness.update({ where: { id: wid }, data: { sortOrder } })
        }
        return true
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
    .catch(mapDbError)
}

export async function deleteWitness(id: string): Promise<{ wasActive: boolean; storageWarning?: string }> {
  const existing = await prisma.witness.findUnique({ where: { id } })
  if (!existing) throw new AdminWitnessError("A tanú nem található.", 404)

  const check = checkDeletable(id, await loadSnapshots())
  if (!check.ok) throw new AdminWitnessError(check.error, 409)

  await prisma.witness.delete({ where: { id } })
  // Az aláírás-kép törlése a rekord után: ha ez elbukik, nincs hiányzó képű tanú, legfeljebb árva fájl
  try {
    await deleteWitnessSignature(existing.signatureKey)
    return { wasActive: existing.isActive }
  } catch {
    return { wasActive: existing.isActive, storageWarning: "A tanú törölve, de az aláírás-kép törlése a tárolóból nem sikerült." }
  }
}
