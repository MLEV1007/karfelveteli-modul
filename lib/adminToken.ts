// Admin session / "2FA függőben" cookie-k aláírása és ellenőrzése.
// Szándékosan CSAK Web Crypto-t használ (nincs Node `crypto`/`Buffer` import), így ugyanaz a kód fut
// a Node route handlerekben ÉS az Edge middleware-ben (ott nincs DB-hívás, csak az aláírás ellenőrzése).
// Külön titok (ADMIN_SESSION_SECRET), mint a technikusi/szerkesztési session-é (SESSION_SECRET).

export const ADMIN_PENDING_COOKIE = "admin_pending"
export const ADMIN_SESSION_COOKIE = "admin_session"
export const ADMIN_PENDING_TTL_SECONDS = 5 * 60 // 5 perc
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60 // 8 óra
export const ADMIN_SECRET_MIN_BYTES = 32

export type AdminTokenKind = "pending" | "session"

const MAX_TTL: Record<AdminTokenKind, number> = {
  pending: ADMIN_PENDING_TTL_SECONDS,
  session: ADMIN_SESSION_TTL_SECONDS,
}

const encoder = new TextEncoder()

export type AdminSecretProblem = "missing" | "too_short"

/** Visszaadja az aláíró titkot, vagy null-t, ha hiányzik / túl rövid (< 32 bájt). */
export function getAdminSessionSecret(
  env: Record<string, string | undefined> = process.env
): string | null {
  return adminSecretProblem(env) ? null : (env.ADMIN_SESSION_SECRET as string)
}

export function adminSecretProblem(
  env: Record<string, string | undefined> = process.env
): AdminSecretProblem | null {
  const secret = env.ADMIN_SESSION_SECRET
  if (!secret) return "missing"
  if (encoder.encode(secret).length < ADMIN_SECRET_MIN_BYTES) return "too_short"
  return null
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)
  try {
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  )
}

interface TokenPayload {
  v: 1
  k: AdminTokenKind
  sub: string
  iat: number
  exp: number
}

/** Aláírt token: base64url(payload).base64url(HMAC-SHA256). A `pending` csak az adminId-t hordozza. */
export async function signAdminToken(
  kind: AdminTokenKind,
  adminId: string,
  secret: string,
  opts: { now?: number; ttlSeconds?: number } = {}
): Promise<string> {
  const nowSec = Math.floor((opts.now ?? Date.now()) / 1000)
  const ttl = Math.min(opts.ttlSeconds ?? MAX_TTL[kind], MAX_TTL[kind])
  const payload: TokenPayload = { v: 1, k: kind, sub: adminId, iat: nowSec, exp: nowSec + ttl }
  const encoded = b64urlEncode(encoder.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(encoded))
  return `${encoded}.${b64urlEncode(new Uint8Array(sig))}`
}

/** Érvényes aláírás + típus + lejárat esetén {adminId, expiresAt}, különben null. Soha nem dob. */
export async function verifyAdminToken(
  value: string | undefined | null,
  kind: AdminTokenKind,
  secret: string,
  now: number = Date.now()
): Promise<{ adminId: string; expiresAt: number } | null> {
  try {
    if (!value || value.length > 1024) return null
    const parts = value.split(".")
    if (parts.length !== 2) return null
    const [encoded, sigPart] = parts
    const sig = b64urlDecode(sigPart)
    if (!sig) return null

    // crypto.subtle.verify időben állandó összehasonlítást végez
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret, "verify"),
      sig as BufferSource,
      encoder.encode(encoded)
    )
    if (!ok) return null

    const raw = b64urlDecode(encoded)
    if (!raw) return null
    const payload = JSON.parse(new TextDecoder().decode(raw)) as Partial<TokenPayload>
    if (payload.v !== 1 || payload.k !== kind) return null
    if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 64) return null
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null

    const nowSec = Math.floor(now / 1000)
    if (payload.exp <= nowSec) return null
    if (payload.exp - payload.iat > MAX_TTL[kind]) return null // védelem a túl hosszú élettartam ellen
    if (payload.iat > nowSec + 60) return null // jövőbeli kiállítás (órakülönbség tűrése: 60 mp)

    return { adminId: payload.sub, expiresAt: payload.exp * 1000 }
  } catch {
    return null
  }
}
