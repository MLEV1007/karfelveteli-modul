import { z } from "zod"

// A kliens-hibanapló (POST /api/client-log) engedélyezett eseményei. Szándékosan zárt lista:
// a végpont semmilyen szabad szöveget nem fogad el.
export const CLIENT_LOG_EVENTS = [
  "signature_export_ok",
  "signature_export_empty",
  "signature_export_error",
  "signature_resize_deferred",
  "signature_pointer_lost",
  "draft_storage_error",
  "submit_attempt",
  "submit_success",
  "submit_network_error",
  "submit_timeout",
  "submit_server_error",
] as const

export type ClientLogEvent = (typeof CLIENT_LOG_EVENTS)[number]

// Csak méretek / számlálók / hibakód — SEMMI személyes adat, aláírás-adat vagy űrlap-tartalom.
// A .strict() miatt minden ismeretlen mező (pl. "ownerName", "dataUrl") 400-at eredményez.
export const clientLogSchema = z
  .object({
    event: z.enum(CLIENT_LOG_EVENTS),
    canvasWidth: z.number().int().min(0).max(20000).optional(),
    canvasHeight: z.number().int().min(0).max(20000).optional(),
    points: z.number().int().min(0).max(1_000_000).optional(),
    dataUrlLength: z.number().int().min(0).max(100_000_000).optional(),
    // Rövid, gépi hibakód (pl. "HTTP_500", "ABORT", "EMPTY_CANVAS") — szabad szöveg nem fér bele.
    errorCode: z
      .string()
      .max(40)
      .regex(/^[A-Za-z0-9_.:-]+$/)
      .optional(),
    // Kliens-oldali időbélyeg (ms, epoch)
    ts: z.number().int().min(0).max(8_640_000_000_000_000),
  })
  .strict()

export type ClientLogPayload = z.infer<typeof clientLogSchema>

export const CLIENT_LOG_MAX_BODY_BYTES = 4096
