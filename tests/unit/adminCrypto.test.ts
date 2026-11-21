import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AdminCryptoConfigError,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  getTotpEncKey,
  hashPassword,
  hashRecoveryCode,
  normalizeRecoveryCode,
  validatePasswordStrength,
  verifyAgainstDummy,
  verifyPassword,
} from "../../lib/adminCrypto"

// Nyilvánvalóan hamis, teszt-kulcsok
const KEY_A = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
const KEY_B = "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100"

test("jelszó-hash: egyedi só, helyes/hibás jelszó, sérült hash", async () => {
  const pw = "helyes-ló-tűzhely-kapcsoló-17"
  const h1 = await hashPassword(pw)
  const h2 = await hashPassword(pw)
  assert.notEqual(h1, h2, "egyedi só → eltérő hash")
  assert.match(h1, /^scrypt\$65536\$8\$1\$[\w-]+\$[\w-]+$/)
  assert.equal(await verifyPassword(pw, h1), true)
  assert.equal(await verifyPassword(pw + "x", h1), false)
  assert.equal(await verifyPassword("", h1), false)
  assert.equal(await verifyPassword(pw, "nem-hash"), false)
  assert.equal(await verifyPassword(pw, h1.replace("$65536$", "$4294967296$")), false) // manipulált N
  assert.equal(await verifyAgainstDummy(pw), false)
})

test("jelszó-hash: Unicode normalizálás (NFC/NFD azonos jelszó)", async () => {
  const nfc = "árvíztűrő-tükörfúrógép-1"
  const nfd = nfc.normalize("NFD")
  const h = await hashPassword(nfc)
  assert.equal(await verifyPassword(nfd, h), true)
})

test("TOTP-titok AES-256-GCM: körbeforgatás, rossz kulcs, átírt adat, hiányzó/hibás kulcs", () => {
  const secret = Buffer.from("0123456789abcdef0123")
  const enc = encryptTotpSecret(secret, KEY_A)
  assert.ok(enc.startsWith("v1."))
  assert.notEqual(enc, encryptTotpSecret(secret, KEY_A), "véletlen IV")
  assert.deepEqual(decryptTotpSecret(enc, KEY_A), secret)
  assert.throws(() => decryptTotpSecret(enc, KEY_B))
  const parts = enc.split(".")
  const tampered = [parts[0], parts[1], parts[2], Buffer.from("xxxxxxxxxxxxxxxxxxxx").toString("base64url")].join(".")
  assert.throws(() => decryptTotpSecret(tampered, KEY_A))
  assert.throws(() => decryptTotpSecret("v1.a.b", KEY_A))

  assert.throws(() => getTotpEncKey(undefined), AdminCryptoConfigError)
  assert.throws(() => getTotpEncKey(""), AdminCryptoConfigError)
  assert.throws(() => getTotpEncKey("abc"), /64 hexa/)
  assert.throws(() => getTotpEncKey("z".repeat(64)), AdminCryptoConfigError)
  try {
    getTotpEncKey("z".repeat(64))
  } catch (e) {
    assert.ok(!(e as Error).message.includes("zzzz"), "a hibaüzenet nem tartalmazza a kulcsot")
  }
})

test("helyreállító kódok: 10 db, XXXX-XXXX, egyediek, hash determinisztikus, normalizálás", () => {
  const codes = generateRecoveryCodes()
  assert.equal(codes.length, 10)
  assert.equal(new Set(codes).size, 10)
  for (const c of codes) assert.match(c, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)

  const h = hashRecoveryCode(codes[0], KEY_A)
  assert.match(h, /^[0-9a-f]{64}$/)
  assert.equal(h, hashRecoveryCode(codes[0].toLowerCase().replace("-", " "), KEY_A))
  assert.notEqual(h, hashRecoveryCode(codes[1], KEY_A))
  assert.notEqual(h, hashRecoveryCode(codes[0], KEY_B), "más kulcs → más hash")
  assert.ok(!h.includes(codes[0].replace("-", "")), "a hash nem tartalmazza a kódot")

  assert.equal(normalizeRecoveryCode("abcd efgh"), "ABCD-EFGH")
  assert.equal(normalizeRecoveryCode("ABCD-EFG"), null)
  assert.equal(normalizeRecoveryCode("ABCD-EFG0"), null) // 0 nincs az ábécében
  assert.equal(normalizeRecoveryCode("123456"), null)
  assert.throws(() => hashRecoveryCode("rossz", KEY_A))
})

test("jelszó-erősség: elfogadja az erős jelszót", () => {
  for (const pw of ["helyes-ló-tűzhely-kapcsoló-17", "Kv9#mTq2$Lw8!zRx5pN", "narancs sárga bicikli kerekezik"]) {
    const r = validatePasswordStrength(pw, { email: "levi@example.invalid", name: "Teszt Elek" })
    assert.deepEqual(r, { ok: true, errors: [] }, pw)
  }
})

test("jelszó-erősség: elutasítja a rövid, gyakori és mintás jelszavakat", () => {
  const bad = [
    "short1!", // rövid
    "123456789012345", // 15 karakter
    "passwordpassword", // gyakori
    "Password1234567890", // gyakori mag + számok
    "qwertyuiopasdfgh", // billentyűzet-minta
    "1234567890123456", // számsor
    "abcdefghijklmnop", // ábécé-sorozat
    "aaaaaaaaaaaaaaaa", // azonos karakter
    "abcabcabcabcabcabc", // ismétlődő minta
    "JelszóJelszó1234", // gyakori magyar
    "x".repeat(129), // túl hosszú
  ]
  for (const pw of bad) assert.equal(validatePasswordStrength(pw).ok, false, pw)
  assert.equal(validatePasswordStrength("levente-molnar-2026-x", { email: "levente.molnar@example.invalid" }).ok, false) // e-mail része
  assert.equal(validatePasswordStrength("correct horse battery staple").ok, false) // közismert példa-jelszó
  assert.equal(validatePasswordStrength("kutya-macska-egér-ablak-42", { email: "levente.molnar@example.invalid" }).ok, true)
  assert.equal(validatePasswordStrength("xxlevente.molnarxx-9Qz!", { email: "levente.molnar@example.invalid" }).ok, false)
})
