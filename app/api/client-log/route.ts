import { NextRequest, NextResponse } from "next/server"
import { enforceClientLogRateLimit } from "@/lib/ratelimit"
import { clientLogSchema, CLIENT_LOG_MAX_BODY_BYTES } from "@/lib/clientLogSchema"

// Kliens-oldali diagnosztikai napló (aláírás-vászon, beküldés). KIZÁRÓLAG technikai
// adatokat naplóz: esemény neve, UA (levágva), vászonméret, pontok száma, dataURL hossza,
// hibakód, időbélyeg. Személyes adatot, aláírást, űrlap-tartalmat sem nem fogad el
// (a séma strict), sem nem naplóz. A hívó fire-and-forget módon használja, a végpont
// hibája soha nem blokkolhatja az űrlapot.

export const dynamic = "force-dynamic"

function sanitizeUserAgent(raw: string | null): string {
  // vezérlő- és nem-ASCII karakterek eldobása, levágás
  return (raw ?? "").replace(/[^\x20-\x7e]/g, "").slice(0, 160)
}

export async function POST(req: NextRequest) {
  try {
    // Fail-closed, a meglévő ratelimit szerint (külön, szigorúbb kulccsal)
    const rateLimitResponse = await enforceClientLogRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const declaredLength = Number(req.headers.get("content-length") ?? "0")
    if (declaredLength > CLIENT_LOG_MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Túl nagy kérés" }, { status: 413 })
    }

    // Szövegként olvassuk (a sendBeacon Content-Type-ja eltérhet), és a tényleges
    // méretet is ellenőrizzük, mert a Content-Length hamis vagy hiányzó lehet.
    const text = await req.text()
    if (text.length > CLIENT_LOG_MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Túl nagy kérés" }, { status: 413 })
    }

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Érvénytelen kérés" }, { status: 400 })
    }

    const parsed = clientLogSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen kérés" }, { status: 400 })
    }

    const entry = {
      type: "client_event",
      ...parsed.data,
      ua: sanitizeUserAgent(req.headers.get("user-agent")),
      receivedAt: new Date().toISOString(),
    }

    // Strukturált, egysoros JSON — a Vercel logban a "client_event" kulcsszóra kereshető
    const line = JSON.stringify(entry)
    if (/(error|timeout)$/.test(parsed.data.event)) {
      console.error(line)
    } else {
      console.info(line)
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    // A naplózás hibája sosem terjedhet tovább; a kliens úgyis figyelmen kívül hagyja
    return NextResponse.json({ error: "Naplózási hiba" }, { status: 500 })
  }
}
