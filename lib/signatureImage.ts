// Tanú-aláírás képfeldolgozása (szerver oldalon, sharp-pal): tartalomra vágás, a fehér/közel
// fehér háttér átlátszóvá tétele, ~600 px szélességre skálázás, PNG kimenet ≤ 200 KB.
// Tiszta függvények (nincs Prisma/Supabase) — külön fájlban, hogy egyszerűen tesztelhető legyen.
import sharp from "sharp"
import { signatureDataUrlSchema } from "./validation"

/** A WitnessError itt van definiálva (a lib/witnesses.ts újraexportálja), hogy ne legyen körkörös import. */
export class WitnessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WitnessError"
  }
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
export const MAX_OUTPUT_BYTES = 200 * 1024
export const TARGET_WIDTH = 600
const MAX_HEIGHT = 300
const PADDING = 4
// Ennél világosabb (min(R,G,B)) képpont háttér → teljesen átlátszó; FADE_FROM alatt teljesen fedő,
// közte lineáris átmenet (az élsimított vonalszél szép marad)
const WHITE_CUTOFF = 240
const FADE_FROM = 190
const ALPHA_THRESHOLD = 12
// Dekompressziós bomba elleni védelem
const MAX_INPUT_PIXELS = 40_000_000

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b)
}

/** Rajzolt PNG data URL -> bájtok (a lib/validation.ts signatureDataUrlSchema-jával validálva). */
export function decodeDrawnDataUrl(dataUrl: string): Uint8Array {
  const parsed = signatureDataUrlSchema.safeParse(dataUrl)
  if (!parsed.success) {
    throw new WitnessError("Érvénytelen aláírás: a rajzolt aláírás formátuma hibás vagy túl nagy.")
  }
  const bytes = new Uint8Array(Buffer.from(parsed.data.slice(parsed.data.indexOf(",") + 1), "base64"))
  if (!startsWith(bytes, PNG_MAGIC)) throw new WitnessError("Érvénytelen aláírás: a kép nem PNG.")
  return bytes
}

/** Feltöltött kép ellenőrzése: méret (max 2 MB), MIME (PNG/JPG) és a fájl tényleges tartalma (magic byte). */
export function validateUploadedImage(bytes: Uint8Array, mimeType: string | undefined): void {
  if (bytes.length === 0) throw new WitnessError("A feltöltött fájl üres.")
  if (bytes.length > MAX_UPLOAD_BYTES) throw new WitnessError("A feltöltött kép túl nagy (legfeljebb 2 MB lehet).")
  const mime = (mimeType ?? "").toLowerCase()
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/jpg") {
    throw new WitnessError("Csak PNG vagy JPG kép tölthető fel.")
  }
  const isPng = startsWith(bytes, PNG_MAGIC)
  const isJpeg = startsWith(bytes, JPEG_MAGIC)
  if (!isPng && !isJpeg) throw new WitnessError("A fájl tartalma nem PNG vagy JPG kép.")
  if ((mime === "image/png") !== isPng) {
    throw new WitnessError("A fájl típusa nem egyezik a tartalmával.")
  }
}

/**
 * Aláírás-kép feldolgozása: bemenet PNG/JPG bájtok, kimenet átlátszó hátterű, a tartalomra vágott
 * PNG (legfeljebb 600 px széles, ≤ 200 KB). Hibánál magyar WitnessError.
 */
export async function processSignatureImage(input: Uint8Array): Promise<Buffer> {
  let raw: { data: Buffer; width: number; height: number }
  try {
    const { data, info } = await sharp(Buffer.from(input), { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // EXIF-tájolás (telefonos fotó)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    raw = { data, width: info.width, height: info.height }
  } catch {
    throw new WitnessError("A képet nem sikerült feldolgozni. Kérjük, tölts fel másik (PNG vagy JPG) képet.")
  }

  const { data, width, height } = raw
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const m = Math.min(data[i], data[i + 1], data[i + 2])
      let keep = 1
      if (m >= WHITE_CUTOFF) keep = 0
      else if (m > FADE_FROM) keep = (WHITE_CUTOFF - m) / (WHITE_CUTOFF - FADE_FROM)
      const a = Math.round(data[i + 3] * keep)
      data[i + 3] = a
      if (a > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) {
    throw new WitnessError("Az aláírás üresnek tűnik (nincs rajta látható vonal). Kérjük, próbáld újra.")
  }

  const left = Math.max(0, minX - PADDING)
  const top = Math.max(0, minY - PADDING)
  const cropW = Math.min(width, maxX + PADDING + 1) - left
  const cropH = Math.min(height, maxY + PADDING + 1) - top

  try {
    const cropped = sharp(data, { raw: { width, height, channels: 4 } }).extract({
      left,
      top,
      width: cropW,
      height: cropH,
    })
    // Először a ~600 px-es változat; ha nagyobb 200 KB-nál, fokozatosan kisebb méret / palettás PNG
    for (const w of [TARGET_WIDTH, 500, 400, 300]) {
      for (const palette of [false, true]) {
        const out = await cropped
          .clone()
          .resize({ width: w, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9, palette })
          .toBuffer()
        if (out.length <= MAX_OUTPUT_BYTES) return out
      }
    }
  } catch {
    throw new WitnessError("A képet nem sikerült feldolgozni. Kérjük, tölts fel másik (PNG vagy JPG) képet.")
  }
  throw new WitnessError("Az aláírás képe a feldolgozás után is túl nagy. Kérjük, használj egyszerűbb aláírás-képet.")
}
