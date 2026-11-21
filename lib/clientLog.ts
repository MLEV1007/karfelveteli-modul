// Kliens-oldali segéd: technikai események küldése a /api/client-log végpontra.
// Fire-and-forget: sosem dob hibát, sosem vár, a felhasználót semmiben nem zavarja.
// Csak méreteket / számlálókat / gépi hibakódot küldünk — személyes adatot, aláírás-adatot
// és űrlap-tartalmat SOHA (a szerver strict séma szerint úgyis elutasítja).
import type { ClientLogEvent } from "./clientLogSchema"

export interface ClientLogDetails {
  canvasWidth?: number
  canvasHeight?: number
  points?: number
  dataUrlLength?: number
  errorCode?: string
}

// Egy oldalbetöltés alatt legfeljebb ennyi esemény megy ki (a szerver is limitál: 20 / 10 perc / IP)
const MAX_EVENTS_PER_PAGE = 12
let sentCount = 0

const intOrUndefined = (n: number | undefined): number | undefined =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : undefined

export function logClientEvent(event: ClientLogEvent, details: ClientLogDetails = {}): void {
  try {
    if (typeof window === "undefined") return
    if (sentCount >= MAX_EVENTS_PER_PAGE) return
    sentCount++

    const payload: Record<string, unknown> = {
      event,
      ts: Date.now(),
      canvasWidth: intOrUndefined(details.canvasWidth),
      canvasHeight: intOrUndefined(details.canvasHeight),
      points: intOrUndefined(details.points),
      dataUrlLength: intOrUndefined(details.dataUrlLength),
      errorCode: details.errorCode?.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 40) || undefined,
    }
    const body = JSON.stringify(payload) // az undefined mezők kimaradnak

    const url = "/api/client-log"
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
      if (queued) return
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // szándékosan némán elnyeljük
  }
}
