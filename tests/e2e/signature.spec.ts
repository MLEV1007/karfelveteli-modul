import { test, expect, type Page } from "@playwright/test"
import { drawStroke, firePointer, settleLayout, wavePoints } from "./helpers/pointer"

// A SignaturePad viselkedése a /dev/signature tesztoldalon (csak dev szerveren elérhető).
// A /api/client-log hívásokat mockoljuk és összegyűjtjük.

const ALLOWED_LOG_KEYS = ["event", "ts", "canvasWidth", "canvasHeight", "points", "dataUrlLength", "errorCode"]

// A valódi egér pointerId-ja 1: a gombkattintások ne ütközzenek a szintetikus pointerrel
const PID = { pointerId: 5 }

async function setup(page: Page) {
  const logBodies: string[] = []
  // A sendBeacon-t kikapcsoljuk, hogy a (route-mockolható) fetch keepalive ág fusson
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", { value: () => false, configurable: true })
  })
  await page.route("**/api/client-log", async (route) => {
    logBodies.push(route.request().postData() ?? "")
    await route.fulfill({ status: 204 })
  })
  await page.goto("/dev/signature")
  await expect(page.getByTestId("signature-canvas")).toBeVisible()
  await settleLayout(page)
  return { logBodies }
}

async function exportResult(page: Page) {
  await page.getByTestId("export").click()
  const text = await page.getByTestId("result").textContent()
  return JSON.parse(text || "{}") as {
    ok: boolean
    code: string | null
    message: string | null
    diagnostics: { canvasWidth: number; canvasHeight: number; points: number; dataUrlLength: number }
  }
}

test.describe("SignaturePad", () => {
  test("rajzolás pointer eseményekkel: egy vonal, minden pont rögzül", async ({ page }) => {
    await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    const sent = await drawStroke(canvas, wavePoints(25))
    await expect(page.getByTestId("stroke-ends")).toHaveText("1")
    const r = await exportResult(page)
    expect(r.ok).toBe(true)
    expect(r.diagnostics.points).toBe(sent)
  })

  test("a 2. pointer (tenyér / 2. ujj) figyelmen kívül marad", async ({ page }) => {
    await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    await firePointer(canvas, "pointerdown", 0.1, 0.5, { pointerId: 1 })
    await firePointer(canvas, "pointermove", 0.2, 0.4, { pointerId: 1 })
    // 2. ujj: teljes érintés közben
    await drawStroke(canvas, wavePoints(8, 0.5, 0.6, 0.8, 0.05), { pointerId: 2 })
    await firePointer(canvas, "pointermove", 0.3, 0.6, { pointerId: 1 })
    await firePointer(canvas, "pointerup", 0.3, 0.6, { pointerId: 1 })

    await expect(page.getByTestId("stroke-ends")).toHaveText("1")
    const r = await exportResult(page)
    expect(r.ok).toBe(true)
    expect(r.diagnostics.points).toBe(3) // csak az 1. pointer: down + 2 move
  })

  test("toll elsőbbséget élvez: a tenyér addigi vonala eldobódik", async ({ page }) => {
    await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    await firePointer(canvas, "pointerdown", 0.1, 0.9, { pointerId: 7, pointerType: "touch" })
    await firePointer(canvas, "pointermove", 0.12, 0.92, { pointerId: 7, pointerType: "touch" })
    const penPoints = await drawStroke(canvas, wavePoints(6), { pointerId: 9, pointerType: "pen", pressure: 0.7 })
    // a tenyér későbbi mozgása / felengedése már nem számít
    await firePointer(canvas, "pointermove", 0.2, 0.95, { pointerId: 7, pointerType: "touch" })
    await firePointer(canvas, "pointerup", 0.2, 0.95, { pointerId: 7, pointerType: "touch" })

    await expect(page.getByTestId("stroke-ends")).toHaveText("1")
    const r = await exportResult(page)
    expect(r.ok).toBe(true)
    expect(r.diagnostics.points).toBe(penPoints)
  })

  test("a pointerleave nem zárja le idő előtt a vonalat", async ({ page }) => {
    await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    const pts = wavePoints(10)
    await firePointer(canvas, "pointerdown", pts[0][0], pts[0][1])
    for (const [x, y] of pts.slice(1, 5)) await firePointer(canvas, "pointermove", x, y)
    await firePointer(canvas, "pointerleave", 1.05, 0.5)
    await expect(page.getByTestId("stroke-ends")).toHaveText("0") // még tart a vonal
    for (const [x, y] of pts.slice(5)) await firePointer(canvas, "pointermove", x, y)
    await firePointer(canvas, "pointerup", pts[9][0], pts[9][1])

    await expect(page.getByTestId("stroke-ends")).toHaveText("1")
    const r = await exportResult(page)
    expect(r.diagnostics.points).toBe(10)
  })

  test("átméretezés rajzolás közben nem törli a vonalat", async ({ page }) => {
    const { logBodies } = await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    const pts = wavePoints(20)
    await firePointer(canvas, "pointerdown", pts[0][0], pts[0][1], PID)
    for (const [x, y] of pts.slice(1, 8)) await firePointer(canvas, "pointermove", x, y, PID)

    await page.getByTestId("narrow").click() // layout-változás vonalhúzás közben
    await settleLayout(page)
    for (const [x, y] of pts.slice(8)) await firePointer(canvas, "pointermove", x, y, PID)
    await firePointer(canvas, "pointerup", pts[19][0], pts[19][1], PID)
    await settleLayout(page)

    await expect(page.getByTestId("stroke-ends")).toHaveText("1")
    // a vonal vége után a halasztott setup() újrarajzolt: van tinta a képernyős vásznon
    const inked = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) return true
      return false
    })
    expect(inked).toBe(true)
    const r = await exportResult(page)
    expect(r.ok).toBe(true)
    expect(r.diagnostics.points).toBe(20)
    // 400 px széles doboz, 2x2 px kerettel: a vászon az új (szűkebb) méretet követi
    expect(r.diagnostics.canvasWidth).toBeLessThanOrEqual(400)
    expect(r.diagnostics.canvasWidth).toBeGreaterThan(300)
    await expect.poll(() => logBodies.some((b) => b.includes("signature_resize_deferred"))).toBe(true)
  })

  test("az exportált PNG átlátszó hátterű és kicsi", async ({ page }) => {
    await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    await drawStroke(canvas, wavePoints(60))
    await drawStroke(canvas, wavePoints(40, 0.2, 0.7, 0.3, 0.1))
    const r = await exportResult(page)
    expect(r.ok).toBe(true)

    const dataUrl = await page.getByTestId("data-url").inputValue()
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true)
    expect(dataUrl.length).toBeGreaterThan(300)
    expect(dataUrl.length).toBeLessThan(100_000) // ~75 KB bináris alatt; jellemzően 20-60 KB

    const info = await page.evaluate(async (url) => {
      const img = new Image()
      img.src = url
      await img.decode()
      const c = document.createElement("canvas")
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let inked = 0
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) inked++
      return { w: c.width, h: c.height, cornerAlpha: d[3], inked }
    }, dataUrl)
    expect(info.w).toBeLessThanOrEqual(1000)
    expect(info.cornerAlpha).toBe(0) // átlátszó háttér, nem fehér
    expect(info.inked).toBeGreaterThan(50)
  })

  test("üres vászon exportja érthető magyar hibaüzenetet ad", async ({ page }) => {
    await setup(page)
    const r = await exportResult(page)
    expect(r.ok).toBe(false)
    expect(r.code).toBe("EMPTY_CANVAS")
    expect(r.message).toContain("aláírás")
  })

  test("a vászon nem jelölhető ki / nincs érintési menü, és görgetés-tiltott", async ({ page }) => {
    await setup(page)
    const style = await page.getByTestId("signature-canvas").evaluate((el) => {
      const s = getComputedStyle(el)
      return { touchAction: s.touchAction, userSelect: s.userSelect || (s as unknown as Record<string, string>).webkitUserSelect }
    })
    expect(style.touchAction).toBe("none")
    expect(style.userSelect).toBe("none")
  })

  test("a hibanapló csak technikai mezőket küld (nincs aláírás-adat)", async ({ page }) => {
    const { logBodies } = await setup(page)
    const canvas = page.getByTestId("signature-canvas")
    await drawStroke(canvas, wavePoints(15))
    // az export-diagnosztika a "Alkalmazom" gombnál naplózódik élesben; itt a resize-esemény is jó minta
    await page.getByTestId("narrow").click()
    await firePointer(canvas, "pointerdown", 0.3, 0.3, PID)
    await page.getByTestId("wide").click()
    await settleLayout(page)
    await firePointer(canvas, "pointerup", 0.3, 0.3, PID)
    await expect.poll(() => logBodies.length).toBeGreaterThan(0)
    for (const body of logBodies) {
      const parsed = JSON.parse(body) as Record<string, unknown>
      for (const key of Object.keys(parsed)) expect(ALLOWED_LOG_KEYS).toContain(key)
      expect(body).not.toContain("data:image")
      expect(body.length).toBeLessThan(400)
    }
  })
})
