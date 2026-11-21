// Az admin létrehozó / 2FA-reset script tesztelhető logikája (a szkript csak a terminál-IO-t és a Prisma-t adja hozzá).
// Titkos adatot (jelszó, TOTP-titok, helyreállító kód) soha nem naplóz; a kimenetre csak az io.print-en keresztül,
// és csak egyszer ír ki titkot.
import {
  encryptTotpSecret,
  generateRecoveryCodes,
  hashPassword,
  hashRecoveryCode,
  validatePasswordStrength,
} from "./adminCrypto"
import { base32Encode, buildOtpauthUri, generateTotpSecret, verifyTotp } from "./totp"

export const TOTP_ISSUER = "M1 Szerviz Admin"
const MAX_CODE_ATTEMPTS = 3
const MAX_PASSWORD_ATTEMPTS = 3

export interface SetupIo {
  ask(question: string): Promise<string>
  askHidden(question: string): Promise<string>
  print(line: string): void
}

export interface AdminRecord {
  id: string
  email: string
  name: string
}

export interface NewAdminData {
  email: string
  name: string
  passwordHash: string
  totpSecretEnc: string
  totpEnabledAt: Date
  lastTotpStep: number
  recoveryCodeHashes: string[]
}

export interface ResetTotpData {
  totpSecretEnc: string
  totpEnabledAt: Date
  lastTotpStep: number
  recoveryCodeHashes: string[]
}

export interface AdminStore {
  countAdmins(): Promise<number>
  findByEmail(email: string): Promise<AdminRecord | null>
  createAdmin(data: NewAdminData): Promise<void>
  /** Atomikusan: új TOTP-titok, régi helyreállító kódok törlése + újak, számláló/zárolás nullázása. */
  replaceTotp(adminId: string, data: ResetTotpData): Promise<void>
}

export interface SetupOptions {
  resetTotp: boolean
  now?: () => number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email)
}

/** Új TOTP-titok + titkosított alak + otpauth URI. A nyers titok csak a visszaadott objektumban él. */
export function prepareTotpEnrollment(accountEmail: string) {
  const secret = generateTotpSecret(20)
  const secretBase32 = base32Encode(secret)
  return {
    secret,
    secretBase32,
    totpSecretEnc: encryptTotpSecret(secret),
    otpauthUri: buildOtpauthUri({ secretBase32, accountName: accountEmail, issuer: TOTP_ISSUER }),
  }
}

/** Az első kód igazolása (±1 ablak); max. 3 próba. Siker: a felhasznált lépés száma (lastTotpStep). */
async function confirmFirstCode(io: SetupIo, secret: Uint8Array, now: () => number): Promise<number | null> {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const code = (await io.ask("A jelszókezelő által mutatott 6 jegyű kód: ")).replace(/\s/g, "")
    const result = verifyTotp(secret, code, { now: now(), lastStep: null })
    if (result.ok) return result.step
    io.print(`Hibás kód (${attempt}/${MAX_CODE_ATTEMPTS}).`)
  }
  return null
}

function printSecretOnce(io: SetupIo, secretBase32: string, otpauthUri: string) {
  io.print("")
  io.print("Add hozzá a jelszókezelődhöz / hitelesítő alkalmazásodhoz (EZT CSAK EGYSZER LÁTOD):")
  io.print(`  Titok (base32): ${secretBase32}`)
  io.print(`  otpauth URI:    ${otpauthUri}`)
  io.print("")
}

function printRecoveryCodes(io: SetupIo, codes: string[]) {
  io.print("")
  io.print("Helyreállító kódok (EZT CSAK EGYSZER LÁTOD, mentsd el biztonságos helyre; mindegyik egyszer használható):")
  for (const c of codes) io.print(`  ${c}`)
  io.print("")
}

/** A script fő logikája. Visszatérési érték: process exit kód (0 = siker). */
export async function runAdminSetup(io: SetupIo, store: AdminStore, opts: SetupOptions): Promise<number> {
  const now = opts.now ?? Date.now

  if (opts.resetTotp) {
    const email = (await io.ask("A meglévő admin e-mail címe: ")).trim().toLowerCase()
    const admin = isValidEmail(email) ? await store.findByEmail(email) : null
    if (!admin) {
      io.print("Nem található ilyen admin felhasználó. Nem történt módosítás.")
      return 1
    }

    const enrollment = prepareTotpEnrollment(admin.email)
    printSecretOnce(io, enrollment.secretBase32, enrollment.otpauthUri)
    const step = await confirmFirstCode(io, enrollment.secret, now)
    if (step === null) {
      io.print("A kód igazolása sikertelen. Nem történt módosítás (a régi 2FA érvényben maradt).")
      return 1
    }

    const codes = generateRecoveryCodes(10)
    await store.replaceTotp(admin.id, {
      totpSecretEnc: enrollment.totpSecretEnc,
      totpEnabledAt: new Date(now()),
      lastTotpStep: step,
      recoveryCodeHashes: codes.map((c) => hashRecoveryCode(c)),
    })
    io.print("Az új 2FA bekapcsolva, a régi titok és a régi helyreállító kódok érvénytelenek.")
    printRecoveryCodes(io, codes)
    return 0
  }

  if ((await store.countAdmins()) > 0) {
    io.print("Már létezik admin felhasználó (a rendszer 1 adminra van tervezve). Nem történt módosítás.")
    io.print("Új 2FA-titok és helyreállító kódok generálásához használd a --reset-2fa kapcsolót.")
    return 1
  }

  const email = (await io.ask("Admin e-mail cím: ")).trim().toLowerCase()
  if (!isValidEmail(email)) {
    io.print("Érvénytelen e-mail cím.")
    return 1
  }
  const name = (await io.ask("Név: ")).trim()
  if (!name || name.length > 100) {
    io.print("A név kötelező (max. 100 karakter).")
    return 1
  }

  let password: string | null = null
  for (let attempt = 1; attempt <= MAX_PASSWORD_ATTEMPTS && password === null; attempt++) {
    const candidate = await io.askHidden("Jelszó (min. 16 karakter): ")
    const check = validatePasswordStrength(candidate, { email, name })
    if (!check.ok) {
      for (const e of check.errors) io.print(`  - ${e}`)
      continue
    }
    const confirm = await io.askHidden("Jelszó újra: ")
    if (confirm !== candidate) {
      io.print("  - A két jelszó nem egyezik.")
      continue
    }
    password = candidate
  }
  if (password === null) {
    io.print("Nem sikerült elfogadható jelszót megadni. Nem történt módosítás.")
    return 1
  }

  const enrollment = prepareTotpEnrollment(email)
  printSecretOnce(io, enrollment.secretBase32, enrollment.otpauthUri)
  const step = await confirmFirstCode(io, enrollment.secret, now)
  if (step === null) {
    io.print("A kód igazolása sikertelen. Az admin NEM jött létre.")
    return 1
  }

  const codes = generateRecoveryCodes(10)
  await store.createAdmin({
    email,
    name,
    passwordHash: await hashPassword(password),
    totpSecretEnc: enrollment.totpSecretEnc,
    totpEnabledAt: new Date(now()),
    lastTotpStep: step,
    recoveryCodeHashes: codes.map((c) => hashRecoveryCode(c)),
  })
  io.print("Az admin létrejött, a 2FA be van kapcsolva.")
  printRecoveryCodes(io, codes)
  return 0
}
