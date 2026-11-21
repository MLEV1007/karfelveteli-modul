import { test } from "node:test"
import assert from "node:assert/strict"
import { decryptTotpSecret, hashRecoveryCode, verifyPassword } from "../../lib/adminCrypto"
import { base32Decode, totpAt } from "../../lib/totp"
import {
  runAdminSetup,
  type AdminRecord,
  type AdminStore,
  type NewAdminData,
  type ResetTotpData,
  type SetupIo,
} from "../../lib/adminSetup"

// Hamis, teszt-kulcs a futtatás idejére
process.env.ADMIN_TOTP_ENC_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

const STRONG = "helyes-ló-tűzhely-kapcsoló-17"

function makeStore(existing: AdminRecord[] = []) {
  const state = { created: [] as NewAdminData[], replaced: [] as Array<{ id: string; data: ResetTotpData }> }
  const store: AdminStore = {
    countAdmins: async () => existing.length + state.created.length,
    findByEmail: async (email) => existing.find((a) => a.email === email) ?? null,
    createAdmin: async (d) => void state.created.push(d),
    replaceTotp: async (id, data) => void state.replaced.push({ id, data }),
  }
  return { store, state }
}

/** Szkriptelt IO: a TOTP-kódot a kiírt base32 titokból számolja, mint a jelszókezelő. */
function makeIo(answers: { visible: string[]; hidden: string[]; badCodes?: number }) {
  const out: string[] = []
  const visible = [...answers.visible]
  const hidden = [...answers.hidden]
  let badCodes = answers.badCodes ?? 0
  const now = 1_800_000_000_000
  const io: SetupIo = {
    print: (l) => void out.push(l),
    askHidden: async () => hidden.shift() ?? "",
    ask: async (q) => {
      if (q.includes("kód")) {
        if (badCodes > 0) {
          badCodes--
          return "000000"
        }
        const line = out.find((l) => l.includes("Titok (base32):"))!
        const secret = base32Decode(line.split(":")[1].trim())
        return totpAt(secret, now)
      }
      return visible.shift() ?? ""
    },
  }
  return { io, out, now: () => now }
}

test("admin létrehozása: 2FA csak a kód igazolása után, hash-ek tárolva, helyreállító kódok egyszer kiírva", async () => {
  const { store, state } = makeStore()
  const { io, out, now } = makeIo({ visible: ["Admin@Example.invalid", "Teszt Elek"], hidden: [STRONG, STRONG] })
  assert.equal(await runAdminSetup(io, store, { resetTotp: false, now }), 0)

  assert.equal(state.created.length, 1)
  const c = state.created[0]
  assert.equal(c.email, "admin@example.invalid")
  assert.ok(await verifyPassword(STRONG, c.passwordHash))
  assert.ok(!c.passwordHash.includes(STRONG))
  assert.equal(c.recoveryCodeHashes.length, 10)
  assert.ok(c.totpEnabledAt instanceof Date)
  assert.equal(typeof c.lastTotpStep, "number")
  assert.equal(decryptTotpSecret(c.totpSecretEnc).length, 20)

  const printed = out.join("\n")
  assert.ok(printed.includes("otpauth://totp/"))
  const codes = out.filter((l) => /^\s+[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(l)).map((l) => l.trim())
  assert.equal(codes.length, 10)
  assert.deepEqual(codes.map((x) => hashRecoveryCode(x)).sort(), [...c.recoveryCodeHashes].sort())
  assert.ok(!printed.includes(STRONG), "a jelszó nem íródik ki")
})

test("admin létrehozása: hibás első kód → az admin NEM jön létre", async () => {
  const { store, state } = makeStore()
  const { io, now } = makeIo({ visible: ["a@example.invalid", "Teszt"], hidden: [STRONG, STRONG], badCodes: 3 })
  assert.equal(await runAdminSetup(io, store, { resetTotp: false, now }), 1)
  assert.equal(state.created.length, 0)
})

test("admin létrehozása: gyenge jelszó 3x → nincs módosítás; létező admin → érthető elutasítás", async () => {
  const a = makeStore()
  const r1 = makeIo({ visible: ["a@example.invalid", "Teszt"], hidden: ["rovid", "password1234567890", "x"] })
  assert.equal(await runAdminSetup(r1.io, a.store, { resetTotp: false, now: r1.now }), 1)
  assert.equal(a.state.created.length, 0)

  const b = makeStore([{ id: "1", email: "a@example.invalid", name: "A" }])
  const r2 = makeIo({ visible: [], hidden: [] })
  assert.equal(await runAdminSetup(r2.io, b.store, { resetTotp: false, now: r2.now }), 1)
  assert.ok(r2.out.join("\n").includes("--reset-2fa"))
  assert.equal(b.state.created.length, 0)
})

test("--reset-2fa: új titok + új kódok csak igazolás után; ismeretlen e-mail / hibás kód → nincs módosítás", async () => {
  const existing = [{ id: "adm1", email: "a@example.invalid", name: "A" }]

  const ok = makeStore(existing)
  const r = makeIo({ visible: ["a@example.invalid"], hidden: [] })
  assert.equal(await runAdminSetup(r.io, ok.store, { resetTotp: true, now: r.now }), 0)
  assert.equal(ok.state.replaced.length, 1)
  assert.equal(ok.state.replaced[0].id, "adm1")
  assert.equal(ok.state.replaced[0].data.recoveryCodeHashes.length, 10)
  assert.equal(ok.state.created.length, 0)

  const unknown = makeStore(existing)
  const r2 = makeIo({ visible: ["x@example.invalid"], hidden: [] })
  assert.equal(await runAdminSetup(r2.io, unknown.store, { resetTotp: true, now: r2.now }), 1)
  assert.equal(unknown.state.replaced.length, 0)

  const badCode = makeStore(existing)
  const r3 = makeIo({ visible: ["a@example.invalid"], hidden: [], badCodes: 3 })
  assert.equal(await runAdminSetup(r3.io, badCode.store, { resetTotp: true, now: r3.now }), 1)
  assert.equal(badCode.state.replaced.length, 0)
})
