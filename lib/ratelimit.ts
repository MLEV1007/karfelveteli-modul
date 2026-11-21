import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// IP alapú (NEM token alapú), hogy lejárt/idegen tokennel se lehessen spammelni.
// Minden limiter külön Redis-kulcs-előtagot (prefix) kap, így a számlálók függetlenek.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

function createLimiter(
  prefix: string | undefined,
  limiter: ReturnType<typeof Ratelimit.slidingWindow>
): Ratelimit | null {
  if (!(redisUrl && redisToken)) return null
  try {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter,
      analytics: true,
      ...(prefix ? { prefix } : {}),
    })
  } catch (error) {
    console.error("Rate limiter inicializálási hiba:", error)
    return null
  }
}

// Max 10 kérés / IP / óra (a prefix szándékosan az alapértelmezett maradt, hogy a
// már futó számlálók ne nullázódjanak a telepítéskor).
const ratelimit = createLimiter(undefined, Ratelimit.slidingWindow(10, "1 h"))

// Kliens-oldali hibanapló: szigorúbb, külön kulcs — 20 kérés / IP / 10 perc.
const clientLogRatelimit = createLimiter("rl:client-log", Ratelimit.slidingWindow(20, "10 m"))

async function enforce(
  limiter: Ratelimit | null,
  req: NextRequest,
  tooManyMessage: string
): Promise<NextResponse | null> {
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Rate limiting blokkolva: hiányzó vagy érvénytelen Redis konfiguráció élő környezetben"
      )
      return NextResponse.json(
        { error: "A szolgáltatás átmenetileg nem elérhető." },
        { status: 503 }
      )
    }
    console.warn("Rate limiting kihagyva (dev mode) — Redis konfiguráció hiányzik")
    return null
  }

  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1"
  const { success } = await limiter.limit(ip)

  if (!success) {
    return NextResponse.json({ error: tooManyMessage }, { status: 429 })
  }

  return null
}

/**
 * Visszaad egy NextResponse-t, ha a kérést el kell utasítani, vagy null-t, ha
 * folytatható. Élesben FAIL-CLOSED: ha a Redis konfiguráció hiányzik vagy
 * hibás, az endpoint 503-at ad — soha nem enged át kérést védelem nélkül.
 * Dev-ben (NODE_ENV !== "production") warn + átengedés, hogy lokálisan ne
 * kelljen Upstash-t beállítani.
 */
export async function enforceRateLimit(req: NextRequest): Promise<NextResponse | null> {
  return enforce(ratelimit, req, "Túl sok kérés. Kérjük várjon egy órát.")
}

/** Ugyanaz, mint az enforceRateLimit, de a kliens-hibanapló szigorúbb, külön limitjével. */
export async function enforceClientLogRateLimit(req: NextRequest): Promise<NextResponse | null> {
  return enforce(clientLogRatelimit, req, "Túl sok kérés.")
}
