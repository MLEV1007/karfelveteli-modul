import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Max 10 kérés / IP / óra — IP alapú (NEM token alapú), hogy lejárt/idegen
// tokennel se lehessen spammelni.
let ratelimit: Ratelimit | null = null

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

if (redisUrl && redisToken) {
  try {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
    })
  } catch (error) {
    console.error("Rate limiter inicializálási hiba:", error)
  }
}

/**
 * Visszaad egy NextResponse-t, ha a kérést el kell utasítani, vagy null-t, ha
 * folytatható. Élesben FAIL-CLOSED: ha a Redis konfiguráció hiányzik vagy
 * hibás, az endpoint 503-at ad — soha nem enged át kérést védelem nélkül.
 * Dev-ben (NODE_ENV !== "production") warn + átengedés, hogy lokálisan ne
 * kelljen Upstash-t beállítani.
 */
export async function enforceRateLimit(req: NextRequest): Promise<NextResponse | null> {
  if (!ratelimit) {
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
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: "Túl sok kérés. Kérjük várjon egy órát." },
      { status: 429 }
    )
  }

  return null
}
