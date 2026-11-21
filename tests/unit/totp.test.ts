import { test } from "node:test"
import assert from "node:assert/strict"
import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotpSecret,
  hotp,
  totpAt,
  totpStep,
  verifyTotp,
} from "../../lib/totp"

// RFC 6238, Appendix B: tesztvektorok (8 jegy). A titkok az ASCII "1234567890" ismétlése a hash hosszáig.
const SECRET_SHA1 = Buffer.from("12345678901234567890")
const SECRET_SHA256 = Buffer.from("12345678901234567890123456789012")
const SECRET_SHA512 = Buffer.from("1234567890123456789012345678901234567890123456789012345678901234")

const VECTORS: Array<[number, string, string, string]> = [
  [59, "94287082", "46119246", "90693936"],
  [1111111109, "07081804", "68084774", "25091201"],
  [1111111111, "14050471", "67062674", "99943326"],
  [1234567890, "89005924", "91819424", "93441116"],
  [2000000000, "69279037", "90698825", "38618901"],
  [20000000000, "65353130", "77737706", "47863826"],
]

test("RFC 6238 hivatalos tesztvektorok (SHA1, SHA256, SHA512)", () => {
  for (const [t, sha1, sha256, sha512] of VECTORS) {
    assert.equal(totpAt(SECRET_SHA1, t * 1000, { digits: 8, algorithm: "sha1" }), sha1, `SHA1 t=${t}`)
    assert.equal(totpAt(SECRET_SHA256, t * 1000, { digits: 8, algorithm: "sha256" }), sha256, `SHA256 t=${t}`)
    assert.equal(totpAt(SECRET_SHA512, t * 1000, { digits: 8, algorithm: "sha512" }), sha512, `SHA512 t=${t}`)
  }
})

test("RFC 4226 HOTP tesztvektorok (Appendix D)", () => {
  const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]
  expected.forEach((code, counter) => assert.equal(hotp(SECRET_SHA1, counter), code))
})

test("base32: RFC 4648 vektorok és visszaalakítás", () => {
  const vectors: Array<[string, string]> = [
    ["", ""], ["f", "MY"], ["fo", "MZXQ"], ["foo", "MZXW6"], ["foob", "MZXW6YQ"], ["fooba", "MZXW6YTB"], ["foobar", "MZXW6YTBOI"],
  ]
  for (const [plain, enc] of vectors) {
    assert.equal(base32Encode(Buffer.from(plain)), enc)
    assert.equal(base32Decode(enc).toString(), plain)
  }
  assert.equal(base32Encode(Buffer.from("foobar"), true), "MZXW6YTBOI======")
  assert.equal(base32Decode("mzxw 6ytb-oi======").toString(), "foobar")
  assert.throws(() => base32Decode("MZXW1"))
})

test("base32: véletlen 20 bájtos titok körbeforgatása", () => {
  const s = generateTotpSecret()
  assert.equal(s.length, 20)
  assert.deepEqual(base32Decode(base32Encode(s)), s)
  assert.equal(base32Encode(s).length, 32)
})

test("otpauth URI", () => {
  const uri = buildOtpauthUri({ secretBase32: "JBSWY3DPEHPK3PXP", accountName: "admin@example.invalid", issuer: "M1 Szerviz Admin" })
  const u = new URL(uri)
  assert.equal(u.protocol, "otpauth:")
  assert.equal(u.hostname, "totp")
  assert.equal(decodeURIComponent(u.pathname), "/M1 Szerviz Admin:admin@example.invalid")
  assert.equal(u.searchParams.get("secret"), "JBSWY3DPEHPK3PXP")
  assert.equal(u.searchParams.get("issuer"), "M1 Szerviz Admin")
  assert.equal(u.searchParams.get("algorithm"), "SHA1")
  assert.equal(u.searchParams.get("digits"), "6")
  assert.equal(u.searchParams.get("period"), "30")
})

test("verifyTotp: ±1 lépés ablak, azon kívül elutasít", () => {
  const now = 1_700_000_000_000
  const cur = totpStep(now)
  const at = (step: number) => hotp(SECRET_SHA1, step)
  assert.deepEqual(verifyTotp(SECRET_SHA1, at(cur), { now }), { ok: true, step: cur })
  assert.deepEqual(verifyTotp(SECRET_SHA1, at(cur - 1), { now }), { ok: true, step: cur - 1 })
  assert.deepEqual(verifyTotp(SECRET_SHA1, at(cur + 1), { now }), { ok: true, step: cur + 1 })
  assert.deepEqual(verifyTotp(SECRET_SHA1, at(cur - 2), { now }), { ok: false })
  assert.deepEqual(verifyTotp(SECRET_SHA1, at(cur + 2), { now }), { ok: false })
})

test("verifyTotp: újrajátszás ellen csak lastStep-nél nagyobb lépés fogadható el", () => {
  const now = 1_700_000_000_000
  const cur = totpStep(now)
  const code = hotp(SECRET_SHA1, cur)
  assert.equal(verifyTotp(SECRET_SHA1, code, { now, lastStep: cur }).ok, false) // ugyanaz a lépés: elutasít
  assert.equal(verifyTotp(SECRET_SHA1, code, { now, lastStep: cur + 1 }).ok, false)
  assert.equal(verifyTotp(SECRET_SHA1, hotp(SECRET_SHA1, cur - 1), { now, lastStep: cur }).ok, false) // régebbi lépés
  assert.deepEqual(verifyTotp(SECRET_SHA1, code, { now, lastStep: cur - 1 }), { ok: true, step: cur })
  assert.deepEqual(verifyTotp(SECRET_SHA1, code, { now, lastStep: null }), { ok: true, step: cur })
})

test("verifyTotp: érvénytelen formátumú kód elutasítva", () => {
  const now = 1_700_000_000_000
  for (const bad of ["", "12345", "1234567", "12345a", " 123456", "١٢٣٤٥٦"]) {
    assert.equal(verifyTotp(SECRET_SHA1, bad, { now }).ok, false, JSON.stringify(bad))
  }
})
