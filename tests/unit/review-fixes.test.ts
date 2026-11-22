import { test } from "node:test"
import assert from "node:assert/strict"
import { clientIp } from "../../lib/clientIp"
import { clearExpiredLock, hasExpiredLock } from "../../lib/adminAuth"
import { enforceAdminAuthRateLimit, type LimiterLike } from "../../lib/ratelimit"
import { readBodyLimited, BodyTooLargeError } from "../../lib/bodyLimit"
import { readJsonBody } from "../../lib/adminApi"
import { computeFieldDiff } from "../../lib/adminDiff"
import { editReportSchema } from "../../lib/validation"

const req = (headers: Record<string, string>, ip?: string) => ({ ip, headers: new Headers(headers) }) as never

// K2
test("clientIp: req.ip > x-real-ip > XFF utolsó eleme", () => {
  assert.equal(clientIp(req({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1, 2.2.2.2" }, "9.9.9.9")), "9.9.9.9")
  assert.equal(clientIp(req({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "5.5.5.5")
  assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.6, 1.1.1.1 , 2.2.2.2" })), "2.2.2.2")
  assert.equal(clientIp(req({ "x-forwarded-for": "3.3.3.3" })), "3.3.3.3")
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1, <script>" })), null)
  assert.equal(clientIp(req({})), null)
})

// K1: zárolás lejárta
test("clearExpiredLock: lejárt zárolásnál nullázza a számlálót, élőnél nem nyúl hozzá", async () => {
  const now = 1_800_000_000_000
  const calls: unknown[] = []
  const db = { adminUser: { updateMany: async (a: unknown) => void calls.push(a) } }
  const expired = { id: "a1", lockedUntil: new Date(now - 1000), failedLoginCount: 5 }
  assert.ok(hasExpiredLock(expired, now))
  const out = await clearExpiredLock(expired, now, db)
  assert.equal(out.failedLoginCount, 0)
  assert.equal(out.lockedUntil, null)
  assert.equal(calls.length, 1)

  const active = { id: "a1", lockedUntil: new Date(now + 60_000), failedLoginCount: 5 }
  assert.equal(await clearExpiredLock(active, now, db), active)
  const never = { id: "a1", lockedUntil: null, failedLoginCount: 2 }
  assert.equal(await clearExpiredLock(never, now, db), never)
  assert.equal(calls.length, 1)
})

// K1: limiter-összetétel
function fakeLimiter(max: number) {
  const counts = new Map<string, number>()
  const keys: string[] = []
  const l: LimiterLike = {
    async limit(key) {
      keys.push(key)
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      return { success: n <= max, reset: Date.now() + 60_000 }
    },
  }
  return { l, keys }
}

test("admin login limiter: az (ip+email) szigorú, az account-szintű engedékeny", async () => {
  const pair = fakeLimiter(5)
  const account = fakeLimiter(20)
  const ip = fakeLimiter(1000)
  const limiters = { pair: pair.l, account: account.l, ip: ip.l }

  // támadó IP: 6. próbálkozásra blokkolva
  for (let i = 0; i < 5; i++) assert.equal(await enforceAdminAuthRateLimit("login", "6.6.6.6", "h", limiters), null)
  const blocked = await enforceAdminAuthRateLimit("login", "6.6.6.6", "h", limiters)
  assert.equal(blocked?.status, 429)

  // a valódi admin másik IP-ről még be tud lépni (account-limit 20-ig engedékeny, a pár külön kulcs)
  assert.equal(await enforceAdminAuthRateLimit("login", "7.7.7.7", "h", limiters), null)
  assert.ok(pair.keys.includes("login:7.7.7.7:h") && account.keys.includes("login:h") && ip.keys.includes("login:7.7.7.7"))
})

test("admin login limiter: hiányzó limiter élesben 503 (fail-closed), hiba esetén 503", async () => {
  const prev = process.env.NODE_ENV
  ;(process.env as Record<string, string>).NODE_ENV = "production"
  try {
    const r = await enforceAdminAuthRateLimit("login", "1.1.1.1", "h", { pair: null, account: null, ip: null })
    assert.equal(r?.status, 503)
  } finally {
    ;(process.env as Record<string, string>).NODE_ENV = prev
  }
  const boom: LimiterLike = { limit: async () => { throw new Error("redis") } }
  const r2 = await enforceAdminAuthRateLimit("login", "1.1.1.1", "h", { pair: boom, account: boom, ip: boom })
  assert.equal(r2?.status, 503)
})

// K8
function streamOf(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const x of chunks) c.enqueue(x)
      c.close()
    },
  })
}

test("readBodyLimited: Content-Length és stream-limit", async () => {
  await assert.rejects(readBodyLimited({ headers: new Headers({ "content-length": "100" }), body: null }, 10), BodyTooLargeError)
  // hazudó / hiányzó Content-Length: a stream olvasása közben áll meg
  const big = streamOf([new Uint8Array(6), new Uint8Array(6)])
  await assert.rejects(readBodyLimited({ headers: new Headers(), body: big }, 10), BodyTooLargeError)
  const ok = await readBodyLimited({ headers: new Headers(), body: streamOf([new Uint8Array([1, 2]), new Uint8Array([3])]) }, 10)
  assert.deepEqual(Array.from(ok), [1, 2, 3])
})

test("readJsonBody: érvényes, üres, érvénytelen és túl nagy törzs", async () => {
  const mk = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://x.invalid/", { method: "POST", body, headers }) as never
  assert.deepEqual(await readJsonBody(mk('{"a":1}')), { a: 1 })
  assert.deepEqual(await readJsonBody(mk("")), {})
  assert.equal(await readJsonBody(mk("{nem json")), null)
  assert.equal(await readJsonBody(mk(JSON.stringify({ x: "y".repeat(200) })), 100), null)
  assert.equal(await readJsonBody(mk("{}", { "content-length": "999999999" })), null)
})

// K6
test("diff: üres/null meghatalmazás-lista nem változás, a sorrend nem számít", () => {
  assert.deepEqual(computeFieldDiff({ selectedAuthorizations: null }, { selectedAuthorizations: [] }), [])
  assert.deepEqual(computeFieldDiff({ selectedAuthorizations: [] }, { selectedAuthorizations: undefined }), [])
  assert.deepEqual(computeFieldDiff({ selectedAuthorizations: ["m1", "bodrogi"] }, { selectedAuthorizations: ["bodrogi", "m1"] }), [])
  assert.equal(computeFieldDiff({ selectedAuthorizations: null }, { selectedAuthorizations: ["m1"] }).length, 1)
})

// K5
test("windshieldCauseOther: trim + max 500 (szerkesztés séma)", () => {
  const edit = { ownerName: "Teszt Elek", customerEmail: "a@b.hu", vehiclePlate: "ABC-123", vehicleMake: "A", vehicleModel: "B",
    liableParty: "own", hasCasco: false, accidentDate: "2026-09-18T14:30", outsideSettlement: false, policeInvolved: false,
    damageType: "SZELVEDO_CSERE", windshieldCause: "EGYEB", damageDescription: "x".repeat(25), underInfluence: false, licenseValid: true,
    vatReclaimEligible: false, consentToPhotocopy: true, cascoClaimRequest: false, vehicleEncumbrance: false }
  const ok = editReportSchema.safeParse({ ...edit, windshieldCauseOther: "  körülmény  " })
  assert.ok(ok.success && ok.data.windshieldCauseOther === "körülmény")
  assert.ok(editReportSchema.safeParse({ ...edit, windshieldCauseOther: "y".repeat(500) }).success)
  assert.ok(!editReportSchema.safeParse({ ...edit, windshieldCauseOther: "y".repeat(501) }).success)
})
