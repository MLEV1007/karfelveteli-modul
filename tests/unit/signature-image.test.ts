import test from "node:test"
import assert from "node:assert/strict"
import sharp from "sharp"
import {
  processSignatureImage,
  validateUploadedImage,
  decodeDrawnDataUrl,
  WitnessError,
  MAX_OUTPUT_BYTES,
} from "../../lib/signatureImage"

// Fehér háttér + sötétkék "vonal" egy nagy vásznon
async function makeSignaturePng(opts: { format: "png" | "jpeg"; transparent?: boolean; w?: number; h?: number }) {
  const w = opts.w ?? 1600
  const h = opts.h ?? 900
  const bg = opts.transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 }
  const stroke = await sharp({ create: { width: Math.min(500, w - 10), height: Math.min(20, h - 10), channels: 3, background: { r: 10, g: 20, b: 120 } } }).png().toBuffer()
  const img = sharp({ create: { width: w, height: h, channels: 4, background: bg } }).composite([{ input: stroke, left: 5, top: Math.floor(h / 2 - 10) }])
  return opts.format === "png" ? img.png().toBuffer() : img.flatten({ background: "#fff" }).jpeg({ quality: 90 }).toBuffer()
}

for (const [format, transparent] of [["png", false], ["png", true], ["jpeg", false]] as const) {
  test(`feldolgozás: ${format}${transparent ? " átlátszó" : ""} -> vágott, átlátszó hátterű PNG ≤ 200 KB`, async () => {
    const out = await processSignatureImage(await makeSignaturePng({ format, transparent }))
    assert.ok(out.length <= MAX_OUTPUT_BYTES)
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal((await sharp(out).metadata()).format, "png")
    assert.ok(info.width <= 600 && info.width >= 400, `szélesség: ${info.width}`)
    // a vonal 500x20 + 2x4 px margó -> arány ~ 508:28 -> magasság jóval kisebb a szélességnél
    assert.ok(info.height < info.width / 5, `magasság: ${info.height}`)
    // sarok átlátszó, közép fedő
    const cx = Math.floor(info.width / 2), cy = Math.floor(info.height / 2)
    assert.ok(data[(cy * info.width + cx) * 4 + 3] > 200)
    assert.ok(data[3] < 30, "a bal felső sarok átlátszó")
  })
}

test("üres (csak fehér) kép -> WitnessError", async () => {
  const white = await sharp({ create: { width: 300, height: 100, channels: 3, background: "#fff" } }).png().toBuffer()
  await assert.rejects(processSignatureImage(white), WitnessError)
})

test("sérült kép -> WitnessError", async () => {
  await assert.rejects(processSignatureImage(new Uint8Array([1, 2, 3, 4])), WitnessError)
})

test("feltöltés-ellenőrzés: MIME, magic byte, méret", async () => {
  const png = new Uint8Array(await makeSignaturePng({ format: "png", w: 100, h: 100 }))
  const jpg = new Uint8Array(await makeSignaturePng({ format: "jpeg", w: 100, h: 100 }))
  assert.doesNotThrow(() => validateUploadedImage(png, "image/png"))
  assert.doesNotThrow(() => validateUploadedImage(jpg, "image/jpeg"))
  assert.throws(() => validateUploadedImage(png, "image/gif"), WitnessError)
  assert.throws(() => validateUploadedImage(png, "image/jpeg"), WitnessError) // tartalom != MIME
  assert.throws(() => validateUploadedImage(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), "image/png"), WitnessError)
  assert.throws(() => validateUploadedImage(new Uint8Array(2 * 1024 * 1024 + 1), "image/png"), /2 MB/)
  assert.throws(() => validateUploadedImage(new Uint8Array(0), "image/png"), WitnessError)
})

test("rajzolt data URL: érvényes elfogadva, hibás elutasítva", async () => {
  const png = await makeSignaturePng({ format: "png", w: 200, h: 100 })
  const url = `data:image/png;base64,${png.toString("base64")}`
  assert.ok(decodeDrawnDataUrl(url).length > 0)
  assert.throws(() => decodeDrawnDataUrl("data:image/jpeg;base64,AAAA"), WitnessError)
  assert.throws(() => decodeDrawnDataUrl("nem url"), WitnessError)
})
