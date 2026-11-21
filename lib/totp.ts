// Saját TOTP (RFC 6238) / HOTP (RFC 4226) megvalósítás, külső függőség nélkül.
// Az alkalmazás HMAC-SHA1 / 30 mp / 6 jegy beállítást használ (minden hitelesítő app ezt támogatja);
// az algoritmus-paraméter csak az RFC 6238 hivatalos tesztvektorainak ellenőrzéséhez van.
import { createHmac, randomBytes, timingSafeEqual } from "crypto"

export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
export const TOTP_DEFAULT_WINDOW = 1

export type TotpAlgorithm = "sha1" | "sha256" | "sha512"

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/** RFC 4648 base32 kódolás (alapból padding nélkül, ahogy az otpauth URI-k várják). */
export function base32Encode(data: Uint8Array, padding = false): string {
  let bits = 0
  let value = 0
  let out = ""
  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i]
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
    value &= (1 << bits) - 1
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  if (padding) while (out.length % 8 !== 0) out += "="
  return out
}

/** Base32 dekódolás: kis/nagybetű, szóköz, kötőjel és záró '=' tűrése; érvénytelen karakternél hibát dob. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (let i = 0; i < clean.length; i++) {
    const idx = B32.indexOf(clean[i])
    if (idx < 0) throw new Error("Érvénytelen base32 karakter")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
      value &= (1 << bits) - 1
    }
  }
  return Buffer.from(out)
}

/** Új TOTP-titok (alapból 20 bájt = 160 bit, az RFC 4226 ajánlása). */
export function generateTotpSecret(bytes = 20): Buffer {
  return randomBytes(bytes)
}

/** HOTP (RFC 4226). */
export function hotp(
  secret: Uint8Array,
  counter: number,
  digits = TOTP_DIGITS,
  algorithm: TotpAlgorithm = "sha1"
): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const h = createHmac(algorithm, secret).update(buf).digest()
  const offset = h[h.length - 1] & 0x0f
  const bin =
    ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, "0")
}

export function totpStep(timeMs: number, period = TOTP_PERIOD_SECONDS): number {
  return Math.floor(timeMs / 1000 / period)
}

/** TOTP-kód egy adott időpontra (RFC 6238). */
export function totpAt(
  secret: Uint8Array,
  timeMs: number,
  opts: { period?: number; digits?: number; algorithm?: TotpAlgorithm } = {}
): string {
  const { period = TOTP_PERIOD_SECONDS, digits = TOTP_DIGITS, algorithm = "sha1" } = opts
  return hotp(secret, totpStep(timeMs, period), digits, algorithm)
}

/** otpauth://totp/Issuer:account?secret=...&issuer=... (Key URI Format) */
export function buildOtpauthUri(params: {
  secretBase32: string
  accountName: string
  issuer: string
}): string {
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.accountName)}`
  const query = new URLSearchParams({
    secret: params.secretBase32,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

export type TotpVerifyResult = { ok: true; step: number } | { ok: false }

/**
 * Kód ellenőrzése az aktuális ±window lépés ablakban.
 *  - ÚJRAJÁTSZÁS ELLEN: csak az a lépés fogadható el, amelynek száma > lastStep (egyszer használható kód).
 *    A hívó köteles a visszaadott `step`-et atomikusan elmenteni (lastTotpStep), lásd az auth route-okat.
 *  - Időben állandó: minden ablak-lépést kiértékel, nincs korai kilépés, az összehasonlítás timingSafeEqual.
 */
export function verifyTotp(
  secret: Uint8Array,
  code: string,
  opts: { now?: number; lastStep?: number | null; window?: number } = {}
): TotpVerifyResult {
  const { now = Date.now(), lastStep = null, window = TOTP_DEFAULT_WINDOW } = opts
  if (!/^\d{6}$/.test(code)) return { ok: false }

  const given = Buffer.from(code, "utf8")
  const current = totpStep(now)
  let best: number | null = null

  for (let offset = -window; offset <= window; offset++) {
    const step = current + offset
    if (step < 0) continue
    const expected = Buffer.from(hotp(secret, step), "utf8")
    const match = timingSafeEqual(given, expected)
    const fresh = lastStep === null || step > lastStep
    if (match && fresh && (best === null || step > best)) best = step
  }

  return best === null ? { ok: false } : { ok: true, step: best }
}
