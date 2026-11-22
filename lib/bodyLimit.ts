// Kérés-törzs olvasása valós méretkorláttal (tiszta, DB-mentes — egységtesztelhető).

export class BodyTooLargeError extends Error {
  constructor() {
    super("A kérés törzse túl nagy")
    this.name = "BodyTooLargeError"
  }
}

/**
 * A törzs bájtjai, legfeljebb `maxBytes`-ig. (1) A Content-Length fejléc olvasás ELŐTT ellenőrződik;
 * (2) a stream olvasása közben, és túllépéskor azonnal megszakad (chunked / hazudó Content-Length ellen is).
 * Túl nagy törzsnél BodyTooLargeError-t dob. Üres / hiányzó törzs → üres tömb.
 */
export async function readBodyLimited(
  req: { headers: Headers; body: ReadableStream<Uint8Array> | null },
  maxBytes: number
): Promise<Uint8Array> {
  const declared = req.headers.get("content-length")
  if (declared !== null) {
    const n = Number(declared)
    if (!Number.isFinite(n) || n < 0 || n > maxBytes) throw new BodyTooLargeError()
  }
  if (!req.body) return new Uint8Array(0)

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new BodyTooLargeError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}
