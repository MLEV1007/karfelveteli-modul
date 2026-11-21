import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ADMIN_PENDING_TTL_SECONDS,
  ADMIN_SESSION_TTL_SECONDS,
  adminSecretProblem,
  getAdminSessionSecret,
  signAdminToken,
  verifyAdminToken,
} from "../../lib/adminToken"
import { checkMutationOrigin, isMutatingMethod, isOriginAllowed } from "../../lib/adminCsrf"
import { classifyAdminPath } from "../../lib/adminRoutes"
import { isLocked, lockUntil, shouldLock, LOCK_MINUTES } from "../../lib/adminAuth"

const SECRET = "unit-test-fake-secret-0123456789abcdef-not-real" // ≥ 32 bájt, hamis
const OTHER = "another-fake-secret-0123456789abcdefghijk-not-real"
const T0 = 1_800_000_000_000

test("session-token: aláírás, típus, lejárat", async () => {
  const s = await signAdminToken("session", "adm_1", SECRET, { now: T0 })
  assert.deepEqual(await verifyAdminToken(s, "session", SECRET, T0 + 1000), {
    adminId: "adm_1",
    expiresAt: T0 + ADMIN_SESSION_TTL_SECONDS * 1000,
  })
  // lejárat: 8 óra
  assert.ok(await verifyAdminToken(s, "session", SECRET, T0 + (ADMIN_SESSION_TTL_SECONDS - 5) * 1000))
  assert.equal(await verifyAdminToken(s, "session", SECRET, T0 + (ADMIN_SESSION_TTL_SECONDS + 1) * 1000), null)
  // pending 5 perc
  const p = await signAdminToken("pending", "adm_1", SECRET, { now: T0 })
  assert.ok(await verifyAdminToken(p, "pending", SECRET, T0 + (ADMIN_PENDING_TTL_SECONDS - 5) * 1000))
  assert.equal(await verifyAdminToken(p, "pending", SECRET, T0 + (ADMIN_PENDING_TTL_SECONDS + 1) * 1000), null)
  // típus-összekeverés tiltott
  assert.equal(await verifyAdminToken(p, "session", SECRET, T0), null)
  assert.equal(await verifyAdminToken(s, "pending", SECRET, T0), null)
  // más titok
  assert.equal(await verifyAdminToken(s, "session", OTHER, T0), null)
})

test("session-token: pending csak az adminId-t hordozza", async () => {
  const p = await signAdminToken("pending", "adm_1", SECRET, { now: T0 })
  const payload = JSON.parse(Buffer.from(p.split(".")[0], "base64url").toString())
  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "k", "sub", "v"])
  assert.equal(payload.sub, "adm_1")
})

test("session-token: átírt payload / aláírás / formátum elutasítva", async () => {
  const s = await signAdminToken("session", "adm_1", SECRET, { now: T0 })
  const [enc, sig] = s.split(".")
  const evil = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(enc, "base64url").toString()), sub: "adm_2" })).toString("base64url")
  assert.equal(await verifyAdminToken(`${evil}.${sig}`, "session", SECRET, T0), null)
  assert.equal(await verifyAdminToken(`${enc}.${sig.slice(0, -2)}AA`, "session", SECRET, T0), null)
  for (const bad of [undefined, null, "", "abc", "a.b.c", `${enc}.`, `.${sig}`, "x".repeat(2000)]) {
    assert.equal(await verifyAdminToken(bad as string, "session", SECRET, T0), null)
  }
})

test("session-token: túl hosszú élettartamú vagy jövőbeli token elutasítva", async () => {
  // a sign a TTL-t a maximumra vágja
  const capped = await signAdminToken("pending", "adm_1", SECRET, { now: T0, ttlSeconds: 99999 })
  assert.equal(await verifyAdminToken(capped, "pending", SECRET, T0 + (ADMIN_PENDING_TTL_SECONDS + 5) * 1000), null)
  // jövőbeli kiállítás (> 60 mp eltérés)
  const future = await signAdminToken("session", "adm_1", SECRET, { now: T0 + 10 * 60 * 1000 })
  assert.equal(await verifyAdminToken(future, "session", SECRET, T0), null)
})

test("ADMIN_SESSION_SECRET: hiányzó vagy rövid titok → null (fail-closed)", () => {
  assert.equal(getAdminSessionSecret({}), null)
  assert.equal(adminSecretProblem({}), "missing")
  assert.equal(getAdminSessionSecret({ ADMIN_SESSION_SECRET: "rövid" }), null)
  assert.equal(adminSecretProblem({ ADMIN_SESSION_SECRET: "x".repeat(31) }), "too_short")
  assert.equal(getAdminSessionSecret({ ADMIN_SESSION_SECRET: SECRET }), SECRET)
  assert.equal(adminSecretProblem({ ADMIN_SESSION_SECRET: "x".repeat(32) }), null)
})

test("Origin-ellenőrzés (CSRF)", () => {
  const app = "https://kar.example.invalid"
  assert.ok(isOriginAllowed({ origin: "https://kar.example.invalid", appUrl: app }))
  assert.ok(isOriginAllowed({ origin: "https://kar.example.invalid", host: "kar.example.invalid" }))
  assert.ok(isOriginAllowed({ origin: "http://localhost:3100", host: "localhost:3100" }))
  assert.ok(isOriginAllowed({ origin: "https://kar.example.invalid", host: "internal:3000", forwardedHost: "kar.example.invalid, proxy" }))
  assert.equal(isOriginAllowed({ origin: undefined, host: "kar.example.invalid", appUrl: app }), false) // hiányzó
  assert.equal(isOriginAllowed({ origin: null, appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "null", host: "null", appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "https://evil.example.invalid", host: "kar.example.invalid", appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "https://kar.example.invalid.evil.invalid", host: "kar.example.invalid", appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "https://kar.example.invalid:8443", host: "kar.example.invalid", appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "javascript:alert(1)", host: "alert(1)", appUrl: app }), false)
  assert.equal(isOriginAllowed({ origin: "nem url", host: "nem url" }), false)
})

test("Origin-ellenőrzés: csak mutáló metódusoknál kötelező", () => {
  const h = (o?: string) => ({ get: (n: string) => (n === "origin" ? (o ?? null) : n === "host" ? "kar.example.invalid" : null) })
  for (const m of ["POST", "PUT", "PATCH", "DELETE", "post"]) {
    assert.equal(isMutatingMethod(m), true)
    assert.equal(checkMutationOrigin(m, h(), undefined), false, `${m} Origin nélkül`)
    assert.equal(checkMutationOrigin(m, h("https://kar.example.invalid"), undefined), true)
    assert.equal(checkMutationOrigin(m, h("https://evil.example.invalid"), undefined), false)
  }
  for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(checkMutationOrigin(m, h(), undefined), true)
})

test("middleware útvonal-besorolás: kivételek és fail-closed", () => {
  assert.equal(classifyAdminPath("/admin"), "protected")
  assert.equal(classifyAdminPath("/admin/reports/1"), "protected")
  assert.equal(classifyAdminPath("/api/admin/reports"), "protected")
  assert.equal(classifyAdminPath("/admin/login"), "auth-open")
  assert.equal(classifyAdminPath("/admin/login/"), "auth-open")
  assert.equal(classifyAdminPath("/admin/login/2fa"), "auth-open")
  assert.equal(classifyAdminPath("/admin/login/evil"), "protected")
  assert.equal(classifyAdminPath("/api/admin/auth/login"), "auth-open")
  assert.equal(classifyAdminPath("/api/admin/auth/2fa"), "auth-open")
  assert.equal(classifyAdminPath("/api/admin/auth/logout"), "auth-open")
  assert.equal(classifyAdminPath("/api/admin/auth"), "protected")
  assert.equal(classifyAdminPath("/admin/munkalap/abc123"), "public-munkalap")
  assert.equal(classifyAdminPath("/admin/munkalap"), "protected")
  assert.equal(classifyAdminPath("/admin/munkalapx/1"), "protected")
  // kijátszási kísérletek
  assert.equal(classifyAdminPath("/admin/munkalap/../reports"), "protected")
  assert.equal(classifyAdminPath("/admin/munkalap/%2e%2e/reports"), "protected")
  assert.equal(classifyAdminPath("/admin/munkalap/..%2freports"), "protected")
  assert.equal(classifyAdminPath("/admin//login"), "protected")
  assert.equal(classifyAdminPath("/admin/munkalap\\..\\reports"), "protected")
})

test("zárolási szabályok: 5 hiba → 15 perc", () => {
  assert.equal(shouldLock(4), false)
  assert.equal(shouldLock(5), true)
  assert.equal(lockUntil(T0).getTime(), T0 + LOCK_MINUTES * 60_000)
  assert.equal(LOCK_MINUTES, 15)
  assert.equal(isLocked({ lockedUntil: null }, T0), false)
  assert.equal(isLocked({ lockedUntil: new Date(T0 + 1) }, T0), true)
  assert.equal(isLocked({ lockedUntil: new Date(T0 - 1) }, T0), false)
})
