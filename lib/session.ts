import { createHmac, timingSafeEqual } from "crypto"

/**
 * Aláírt, rövid életű session cookie-k a hosszú élettartamú (7/30 napos),
 * e-mailben kiküldött editToken/technicianToken helyett. A nyers tokent csak
 * a /api/edit/session és /api/munkalap/session csere-endpoint látja egyszer —
 * onnantól minden kérés ezzel a stateless, HMAC-aláírt cookie-val hitelesít,
 * a token soha nem kerül vissza URL-be vagy kliens oldali JS-be.
 */

export type SessionKind = "edit" | "munkalap"

const COOKIE_TTL_SECONDS: Record<SessionKind, number> = {
  edit: 60 * 60 * 2, // 2 óra
  munkalap: 60 * 60 * 2, // 2 óra
}

interface SessionPayload {
  reportId: string
  kind: SessionKind
  exp: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error("SESSION_SECRET hiányzik az environment-ből")
  }
  return secret
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url")
}

export function sessionCookieName(kind: SessionKind, reportId: string): string {
  return `${kind}_session_${reportId}`
}

export function sessionCookieMaxAge(kind: SessionKind): number {
  return COOKIE_TTL_SECONDS[kind]
}

export function createSessionCookieValue(reportId: string, kind: SessionKind): string {
  const payload: SessionPayload = {
    reportId,
    kind,
    exp: Date.now() + COOKIE_TTL_SECONDS[kind] * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encoded}.${sign(encoded)}`
}

export function verifySessionCookieValue(
  value: string | undefined | null,
  reportId: string,
  kind: SessionKind
): boolean {
  if (!value) return false

  const dotIndex = value.lastIndexOf(".")
  if (dotIndex === -1) return false

  const encoded = value.slice(0, dotIndex)
  const signature = value.slice(dotIndex + 1)

  let expected: string
  try {
    expected = sign(encoded)
  } catch {
    return false
  }

  const actualBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload
    return payload.reportId === reportId && payload.kind === kind && payload.exp > Date.now()
  } catch {
    return false
  }
}
