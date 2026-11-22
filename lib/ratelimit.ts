import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { clientIp } from "./clientIp"

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

  // Nem a teljes XFF-sztring (hamisítható, kulcsonként változó): lásd clientIp()
  const ip = clientIp(req) ?? "127.0.0.1"
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

// ---------------------------------------------------------------------------------------------
// Admin bejelentkezés (jelszó- és 2FA-lépés): külön kulcs-előtagok, a meglévő limitek érintetlenek.
// Három limiter: (1) SZIGORÚ: IP + fiók kulcs (5 / 15 perc) — a támadó IP-jét zárja ki, a valódi admint nem;
// (2) fiók-szintű, engedékeny (20 / 15 perc) — csak elosztott találgatás ellen, így egy idegen nem tudja
// kizárni a valódi admint; (3) IP-szintű (10 / 15 perc). Fail-closed élesben (és ha a Redis hibázik).
// ---------------------------------------------------------------------------------------------
const adminLoginPairLimiter = createLimiter("rl:admin-login-pair", Ratelimit.slidingWindow(5, "15 m"))
const adminLoginAccountLimiter = createLimiter("rl:admin-login-acct2", Ratelimit.slidingWindow(20, "15 m"))
const adminLoginIpLimiter = createLimiter("rl:admin-login-ip", Ratelimit.slidingWindow(10, "15 m"))
const admin2faPairLimiter = createLimiter("rl:admin-2fa-pair", Ratelimit.slidingWindow(5, "15 m"))
const admin2faAccountLimiter = createLimiter("rl:admin-2fa-acct2", Ratelimit.slidingWindow(20, "15 m"))
const admin2faIpLimiter = createLimiter("rl:admin-2fa-ip", Ratelimit.slidingWindow(10, "15 m"))

export type AdminAuthScope = "login" | "2fa"

export interface LimiterLike {
  limit(key: string): Promise<{ success: boolean; reset: number }>
}

export interface AdminAuthLimiters {
  pair: LimiterLike | null
  account: LimiterLike | null
  ip: LimiterLike | null
}

const ADMIN_AUTH_LIMITERS: Record<AdminAuthScope, AdminAuthLimiters> = {
  login: { pair: adminLoginPairLimiter, account: adminLoginAccountLimiter, ip: adminLoginIpLimiter },
  "2fa": { pair: admin2faPairLimiter, account: admin2faAccountLimiter, ip: admin2faIpLimiter },
}

/**
 * Visszaad egy NextResponse-t (429/503), ha a kérést el kell utasítani, különben null.
 * `accountKey`: login esetén az e-mail (kisbetűs) SHA-256 hash-e, 2fa esetén az adminId — nyers e-mail nem
 * kerül a Redis-be. `ip` null esetén közös "unknown" vödör. A `limiters` paraméter teszteléshez cserélhető.
 */
export async function enforceAdminAuthRateLimit(
  scope: AdminAuthScope,
  ip: string | null,
  accountKey: string,
  limiters: AdminAuthLimiters = ADMIN_AUTH_LIMITERS[scope]
): Promise<NextResponse | null> {
  const { pair, account, ip: byIp } = limiters

  if (!pair || !account || !byIp) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Admin rate limiting blokkolva: hiányzó vagy érvénytelen Redis konfiguráció élő környezetben"
      )
      return NextResponse.json(
        { error: "A szolgáltatás átmenetileg nem elérhető." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      )
    }
    console.warn("Admin rate limiting kihagyva (dev mode) — Redis konfiguráció hiányzik")
    return null
  }

  const ipPart = ip ?? "unknown"
  try {
    const results = await Promise.all([
      pair.limit(`${scope}:${ipPart}:${accountKey}`),
      account.limit(`${scope}:${accountKey}`),
      byIp.limit(`${scope}:${ipPart}`),
    ])
    const failed = results.filter((r) => !r.success)
    if (failed.length > 0) {
      const reset = Math.max(...failed.map((r) => r.reset))
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      return NextResponse.json(
        { error: "Túl sok próbálkozás. Kérjük, próbálja újra később." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } }
      )
    }
  } catch (error) {
    console.error("Admin rate limit hiba (fail-closed):", error instanceof Error ? error.name : "ismeretlen")
    return NextResponse.json(
      { error: "A szolgáltatás átmenetileg nem elérhető." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
  return null
}
