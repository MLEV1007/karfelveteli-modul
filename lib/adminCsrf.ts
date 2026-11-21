// CSRF-védelem az admin felülethez: mutáló metódusoknál kötelező, egyező Origin fejléc.
// Tiszta függvények (Edge-kompatibilis, tesztelhető).

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method.toUpperCase())
}

export interface OriginCheckInput {
  origin: string | null | undefined
  /** A kérés Host fejléce (pl. "kar.example.hu" vagy "localhost:3100") */
  host?: string | null
  /** X-Forwarded-Host (proxy mögött; böngésző nem tudja cross-site kérésben beállítani) */
  forwardedHost?: string | null
  /** NEXT_PUBLIC_APP_URL */
  appUrl?: string | null
}

function parseOrigin(value: string | null | undefined): URL | null {
  if (!value) return null
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:" ? u : null
  } catch {
    return null
  }
}

/**
 * Igaz, ha az Origin fejléc megegyezik az app saját origin-jével (NEXT_PUBLIC_APP_URL)
 * vagy a kérés hostjával. Hiányzó / "null" / értelmezhetetlen Origin → hamis.
 */
export function isOriginAllowed(input: OriginCheckInput): boolean {
  const o = parseOrigin(input.origin)
  if (!o) return false

  const app = parseOrigin(input.appUrl)
  if (app && app.origin === o.origin) return true

  const hosts = [input.host, input.forwardedHost?.split(",")[0]?.trim()]
    .filter((h): h is string => !!h)
    .map((h) => h.toLowerCase())
  return hosts.includes(o.host.toLowerCase())
}

/** Mutáló metódusnál az Origin ellenőrzése; nem mutálónál mindig igaz. */
export function checkMutationOrigin(
  method: string,
  headers: { get(name: string): string | null },
  appUrl: string | null | undefined
): boolean {
  if (!isMutatingMethod(method)) return true
  return isOriginAllowed({
    origin: headers.get("origin"),
    host: headers.get("host"),
    forwardedHost: headers.get("x-forwarded-host"),
    appUrl,
  })
}
