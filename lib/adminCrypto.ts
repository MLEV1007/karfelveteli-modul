// Admin kriptográfiai segédek: jelszó-hash (scrypt), TOTP-titok titkosítás (AES-256-GCM),
// helyreállító kódok (csak HMAC-hash tárolódik), jelszó-erősség ellenőrzés.
// Csak szerver oldalon (Node `crypto`) — az Edge middleware nem importálja.
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions,
} from "crypto"

// ---------------------------------------------------------------------------------------------
// Konfigurációs hiba (fail-closed: a hívó 503-at ad / megáll, soha nem fut tovább gyenge állapotban)
// ---------------------------------------------------------------------------------------------

export class AdminCryptoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AdminCryptoConfigError"
  }
}

/** ADMIN_TOTP_ENC_KEY: 64 hexa karakter (32 bájt). A hibaüzenet soha nem tartalmazza a kulcsot. */
export function getTotpEncKey(keyHex: string | undefined = process.env.ADMIN_TOTP_ENC_KEY): Buffer {
  if (!keyHex) {
    throw new AdminCryptoConfigError(
      "ADMIN_TOTP_ENC_KEY hiányzik. Generálás: openssl rand -hex 32 (64 hexa karakter)."
    )
  }
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new AdminCryptoConfigError(
      "ADMIN_TOTP_ENC_KEY érvénytelen: pontosan 64 hexa karakter (32 bájt) kell. Generálás: openssl rand -hex 32."
    )
  }
  return Buffer.from(keyHex, "hex")
}

// ---------------------------------------------------------------------------------------------
// Jelszó-hash: scrypt, egyedi só, paraméterek a hash-sztringben (később emelhetők)
// Formátum: scrypt$N$r$p$<só b64url>$<hash b64url>
// ---------------------------------------------------------------------------------------------

const SCRYPT_N = 2 ** 16 // 64 MiB munkamemória
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_BYTES = 16
const SCRYPT_MAXMEM = 256 * 1024 * 1024

function scryptAsync(
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

function normalizePassword(password: string): string {
  return password.normalize("NFKC")
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES)
  const key = await scryptAsync(normalizePassword(password), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`
}

/** Időben állandó ellenőrzés; hibás/sérült hash-nél false (nem dob). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$")
    if (parts.length !== 6 || parts[0] !== "scrypt") return false
    const N = Number(parts[1])
    const r = Number(parts[2])
    const p = Number(parts[3])
    // Védelem sérült/manipulált paraméterek ellen (memória-/CPU-kimerítés)
    if (!Number.isInteger(N) || N < 2 ** 14 || N > 2 ** 17 || (N & (N - 1)) !== 0) return false
    if (!Number.isInteger(r) || r < 1 || r > 16) return false
    if (!Number.isInteger(p) || p < 1 || p > 4) return false
    const salt = Buffer.from(parts[4], "base64url")
    const expected = Buffer.from(parts[5], "base64url")
    if (salt.length < 8 || expected.length < 16) return false

    const actual = await scryptAsync(normalizePassword(password), salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// Modulbetöltéskor készül el (nem az első ismeretlen-felhasználós kérésnél), hogy az első kérés ne legyen
// érezhetően lassabb a többinél. Hiba esetén a verifyAgainstDummy ugyanúgy false-t ad.
const dummyHashPromise: Promise<string | null> = hashPassword(randomBytes(16).toString("hex")).catch(() => null)

/**
 * Nem létező felhasználónál is ugyanannyi scrypt-munkát végzünk (időzítés alapú felhasználó-felderítés
 * ellen). Mindig false-t ad vissza.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  const dummy = await dummyHashPromise
  if (dummy) await verifyPassword(password, dummy)
  return false
}

// ---------------------------------------------------------------------------------------------
// TOTP-titok titkosítása (AES-256-GCM). Formátum: v1.<iv>.<tag>.<ciphertext> (base64url)
// ---------------------------------------------------------------------------------------------

const AAD = Buffer.from("admin-totp-secret:v1", "utf8")

export function encryptTotpSecret(secret: Uint8Array, keyHex?: string): string {
  const key = getTotpEncKey(keyHex ?? process.env.ADMIN_TOTP_ENC_KEY)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(AAD)
  const ct = Buffer.concat([cipher.update(secret), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".")
}

/** Hibás kulcs / sérült vagy átírt adat → hibát dob (a hívó fail-closed kezeli). */
export function decryptTotpSecret(encrypted: string, keyHex?: string): Buffer {
  const key = getTotpEncKey(keyHex ?? process.env.ADMIN_TOTP_ENC_KEY)
  const parts = encrypted.split(".")
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Érvénytelen TOTP-titok formátum")
  const iv = Buffer.from(parts[1], "base64url")
  const tag = Buffer.from(parts[2], "base64url")
  const ct = Buffer.from(parts[3], "base64url")
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Érvénytelen TOTP-titok formátum")
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAAD(AAD)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

// ---------------------------------------------------------------------------------------------
// Helyreállító kódok: XXXX-XXXX, 32 karakteres ábécé (nincs I, O), 40 bit entrópia / kód.
// Az adatbázisban csak a HMAC-SHA256 hash van (kulcs: az ADMIN_TOTP_ENC_KEY-ből származtatva).
// ---------------------------------------------------------------------------------------------

const RECOVERY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // 32 karakter
export const RECOVERY_CODE_COUNT = 10

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>()
  while (codes.size < count) {
    const bytes = randomBytes(8)
    let raw = ""
    for (let i = 0; i < bytes.length; i++) raw += RECOVERY_ALPHABET[bytes[i] & 31] // 256 % 32 == 0 → torzításmentes
    codes.add(`${raw.slice(0, 4)}-${raw.slice(4)}`)
  }
  return Array.from(codes)
}

/** Felhasználói bevitel normalizálása: kis/nagybetű, szóköz, kötőjel tűrése. Érvénytelen formátum → null. */
export function normalizeRecoveryCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[\s-]/g, "")
  if (!/^[2-9A-HJ-NP-Z]{8}$/.test(raw)) return null
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

export function hashRecoveryCode(code: string, keyHex?: string): string {
  const normalized = normalizeRecoveryCode(code)
  if (!normalized) throw new Error("Érvénytelen helyreállító kód formátum")
  const key = getTotpEncKey(keyHex ?? process.env.ADMIN_TOTP_ENC_KEY)
  const derived = createHmac("sha256", key).update("admin-recovery-code:v1").digest()
  return createHmac("sha256", derived).update(normalized).digest("hex")
}

// ---------------------------------------------------------------------------------------------
// Jelszó-erősség: ≥ 16 karakter, gyakori jelszavak és egyszerű minták tiltása
// ---------------------------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 16
export const PASSWORD_MAX_LENGTH = 128

// Rövid, beágyazott lista (normalizált alak: kisbetű, ékezet és nem alfanumerikus karakter nélkül)
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p4ssw0rd", "passwordpassword",
  "passwordpassword1", "letmein", "letmein123", "welcome", "welcome1", "welcome123", "admin", "admin123",
  "administrator", "adminadmin", "adminadminadmin", "root", "toor", "changeme", "changeme123", "iloveyou",
  "iloveyouiloveyou", "monkey", "dragon", "master", "sunshine", "princess", "football", "baseball",
  "trustno1", "abc123", "qwerty", "qwerty123", "qwertz", "qwertyuiop", "qwertzuiop", "qwertyuiopasdfgh",
  "qwertzuiopasdfgh", "asdfghjkl", "asdfghjklqwerty", "zxcvbnm", "1q2w3e4r", "1q2w3e4r5t", "1qaz2wsx",
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345678901", "123456789012",
  "1234567890123456", "12345678901234567890", "0123456789", "987654321", "9876543210", "111111",
  "000000", "jelszo", "jelszo123", "jelszo1234", "jelszojelszo", "magyarorszag", "budapest", "szerviz",
  "karfelvetel", "m1szerviz", "tata", "hunter2", "secret", "supersecret", "secretpassword",
  "thequickbrownfox", "correcthorsebatterystaple", "letmeinletmein", "welcomewelcome", "passwordpassword12",
])

const KEYBOARD_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm", "qwertzuiop", "yxcvbnm"]

function simplify(password: string): string {
  return password
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function adjacencyRatio(s: string): number {
  if (s.length < 2) return 0
  let hits = 0
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1)
    let adjacent = diff === 1 || diff === -1
    if (!adjacent) {
      for (const row of KEYBOARD_ROWS) {
        const a = row.indexOf(s[i - 1])
        const b = row.indexOf(s[i])
        if (a >= 0 && b >= 0 && Math.abs(a - b) === 1) {
          adjacent = true
          break
        }
      }
    }
    if (adjacent) hits++
  }
  return hits / (s.length - 1)
}

export interface PasswordCheck {
  ok: boolean
  errors: string[]
}

export function validatePasswordStrength(
  password: string,
  context: { email?: string; name?: string } = {}
): PasswordCheck {
  const errors: string[] = []
  const length = Array.from(password).length

  if (length < PASSWORD_MIN_LENGTH) {
    errors.push(`A jelszó legalább ${PASSWORD_MIN_LENGTH} karakter hosszú legyen.`)
  }
  if (length > PASSWORD_MAX_LENGTH) {
    errors.push(`A jelszó legfeljebb ${PASSWORD_MAX_LENGTH} karakter hosszú lehet.`)
  }

  const simple = simplify(password)
  const stripped = simple.replace(/\d+$/, "")

  const isCommon =
    COMMON_PASSWORDS.has(simple) ||
    COMMON_PASSWORDS.has(stripped) ||
    Array.from(COMMON_PASSWORDS).some(
      (common) => common.length >= 8 && simple.includes(common) && simple.length - common.length <= 4
    )
  if (isCommon) errors.push("Ez a jelszó túl gyakori vagy túl könnyen kitalálható.")

  if (new Set(Array.from(password)).size < 6) {
    errors.push("A jelszóban legalább 6 különböző karakter legyen.")
  }
  if (/^([\s\S]{1,4})\1{2,}$/.test(password.toLowerCase())) {
    errors.push("A jelszó nem állhat ismétlődő mintából (pl. abcabcabc).")
  }
  if (simple.length >= 8 && adjacencyRatio(simple) >= 0.7) {
    errors.push("A jelszó nem állhat egymást követő karakterekből vagy billentyűzet-mintából (pl. 123456, qwerty).")
  }

  const lower = simple
  const personal: string[] = []
  if (context.email) personal.push(simplify(context.email.split("@")[0] ?? ""))
  if (context.name) personal.push(...context.name.split(/\s+/).map(simplify))
  if (personal.some((p) => p.length >= 4 && lower.includes(p))) {
    errors.push("A jelszó ne tartalmazza az e-mail címet vagy a nevet.")
  }

  return { ok: errors.length === 0, errors }
}
