// Tanú-kezelés üzleti szabályai (tiszta függvények, DB nélkül tesztelhető).
export const REQUIRED_ACTIVE_WITNESSES = 2

export interface WitnessLite {
  id: string
  isActive: boolean
  sortOrder: number
}

export function countActive(witnesses: readonly { isActive: boolean }[]): number {
  return witnesses.filter((w) => w.isActive).length
}

/** Figyelmeztetés, ha az aktív tanúk száma nem pontosan 2; különben null. */
export function activeWitnessWarning(activeCount: number): string | null {
  if (activeCount === REQUIRED_ACTIVE_WITNESSES) return null
  if (activeCount < REQUIRED_ACTIVE_WITNESSES) {
    return `Figyelem: jelenleg ${activeCount} aktív tanú van. A meghatalmazások PONTOSAN 2 aktív tanúval készülhetnek, ezért a lezárás/újragenerálás addig nem működik, amíg nincs 2 aktív tanú.`
  }
  return `Figyelem: jelenleg ${activeCount} aktív tanú van. A meghatalmazások PONTOSAN 2 aktív tanúval készülhetnek — inaktiválj, hogy 2 maradjon.`
}

export type ActivationCheck = { ok: true } | { ok: false; error: string }

/** Aktiválás engedélyezett-e: legfeljebb 2 aktív tanú lehet. Már aktív tanúnál nincs teendő (ok). */
export function checkActivation(witnesses: readonly WitnessLite[], witnessId: string): ActivationCheck {
  const target = witnesses.find((w) => w.id === witnessId)
  if (!target) return { ok: false, error: "A tanú nem található." }
  if (target.isActive) return { ok: true }
  if (countActive(witnesses) >= REQUIRED_ACTIVE_WITNESSES) {
    return {
      ok: false,
      error: "Már 2 aktív tanú van. Előbb inaktiválj egyet, utána aktiválhatod ezt a tanút.",
    }
  }
  return { ok: true }
}

/** Új tanú alapértelmezett aktív állapota: aktív, ha még nincs 2 aktív. */
export function defaultActiveForNew(activeCount: number): boolean {
  return activeCount < REQUIRED_ACTIVE_WITNESSES
}

/** A witnessSnapshot JSON-ban szereplő tanú-azonosítók (hibás/ismeretlen alakú JSON-t kihagy). */
export function witnessIdsInSnapshot(snapshot: unknown): string[] {
  if (!Array.isArray(snapshot)) return []
  const ids: string[] = []
  for (const entry of snapshot) {
    if (entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string") {
      ids.push((entry as { id: string }).id)
    }
  }
  return ids
}

/** Az összes olyan tanú-id, amelyre bármelyik snapshot hivatkozik. */
export function collectReferencedWitnessIds(snapshots: readonly unknown[]): Set<string> {
  const set = new Set<string>()
  for (const s of snapshots) for (const id of witnessIdsInSnapshot(s)) set.add(id)
  return set
}

export function isWitnessReferenced(witnessId: string, snapshots: readonly unknown[]): boolean {
  return snapshots.some((s) => witnessIdsInSnapshot(s).includes(witnessId))
}

export type DeleteCheck = { ok: true } | { ok: false; error: string }

/** Törölhető-e: csak ha egyetlen snapshot sem hivatkozik rá; különben csak inaktiválható. */
export function checkDeletable(witnessId: string, snapshots: readonly unknown[]): DeleteCheck {
  if (isWitnessReferenced(witnessId, snapshots)) {
    return {
      ok: false,
      error:
        "Ez a tanú már szerepel kiadott dokumentumban (meghatalmazás), ezért nem törölhető — csak inaktiválható.",
    }
  }
  return { ok: true }
}

/**
 * Sorrend-módosítás: a lista (sortOrder, majd az adott sorrend) szerint rendezett állapotából
 * a tanút egy hellyel feljebb/lejjebb teszi, és mindenkinek új, folytonos sortOrder-t (0..n-1) ad.
 * Visszaadja a teljes új sorrendet; a határon (első feljebb / utolsó lejjebb) null.
 */
export function moveWitness(
  witnesses: readonly WitnessLite[],
  witnessId: string,
  direction: "up" | "down"
): { id: string; sortOrder: number }[] | null {
  const ordered = witnesses
    .map((w, index) => ({ w, index }))
    .sort((a, b) => a.w.sortOrder - b.w.sortOrder || a.index - b.index)
    .map((x) => x.w.id)
  const i = ordered.indexOf(witnessId)
  if (i === -1) return null
  const j = direction === "up" ? i - 1 : i + 1
  if (j < 0 || j >= ordered.length) return null
  ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
  return ordered.map((id, sortOrder) => ({ id, sortOrder }))
}
