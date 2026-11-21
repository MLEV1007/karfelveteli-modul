// Piszkozat-tárolás sessionStorage-ben: az űrlap állapota és az aláírások a sikeres
// beküldésig megmaradnak (oldalfrissítés, hálózati hiba, véletlen újratöltés esetén).
// A storage lehet tiltott / megtelt / hiányzó (pl. privát mód) — minden hozzáférés
// try/catch-ben van, hiba esetén az űrlap egyszerűen piszkozat nélkül működik tovább.
// Személyes adat NEM kerül naplóba: itt semmit nem logolunk.

export const DRAFT_STORAGE_KEY = "km:draft:v1"
const DRAFT_VERSION = 1
// A piszkozat ennyi ideig érvényes (közös műhelyeszköz: ne maradjon meg a következő ügyfélnek)
export const DRAFT_MAX_AGE_MS = 30 * 60 * 1000

export interface DraftState {
  step: number
  clientRequestId: string
  formData: Record<string, unknown>
}

export function loadDraft(): DraftState | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      v?: number
      step?: unknown
      clientRequestId?: unknown
      formData?: unknown
      savedAt?: unknown
    }
    if (parsed?.v !== DRAFT_VERSION) return null
    // Lejárt vagy időbélyeg nélküli piszkozat: eldobjuk
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      clearDraft()
      return null
    }
    if (typeof parsed.formData !== "object" || parsed.formData === null) return null
    if (typeof parsed.step !== "number" || !Number.isFinite(parsed.step)) return null
    return {
      step: Math.round(parsed.step),
      clientRequestId: typeof parsed.clientRequestId === "string" ? parsed.clientRequestId : "",
      formData: parsed.formData as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

export type SaveDraftResult = "ok" | "ok_without_signatures" | "failed"

const SIGNATURE_FIELDS = ["ownerSignatureUrl", "driverSignatureUrl"]

export function saveDraft(state: DraftState): SaveDraftResult {
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), ...state }))
    return "ok"
  } catch {
    // Kvóta betelt: az aláírás nélküli változatot még megpróbáljuk menteni
    try {
      const slim = { ...state.formData }
      for (const f of SIGNATURE_FIELDS) slim[f] = ""
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), ...state, formData: slim })
      )
      return "ok_without_signatures"
    } catch {
      return "failed"
    }
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // nincs mit tenni
  }
}

// RFC 4122 v4 UUID: crypto.randomUUID(), régi böngészőkben (nem biztonságos kontextus,
// régi Safari) crypto.getRandomValues, végső esetben Math.random alapú tartalék.
export function generateClientRequestId(): string {
  try {
    if (typeof crypto !== "undefined") {
      if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
      if (typeof crypto.getRandomValues === "function") {
        const b = crypto.getRandomValues(new Uint8Array(16))
        b[6] = (b[6] & 0x0f) | 0x40
        b[8] = (b[8] & 0x3f) | 0x80
        const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
      }
    }
  } catch {
    // tartalék lent
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}
