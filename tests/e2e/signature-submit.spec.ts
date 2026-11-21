import { test, expect, type Page, type Request } from "@playwright/test"
import { drawStroke, settleLayout, wavePoints } from "./helpers/pointer"

// Az /api/submit és /api/client-log végpontokat page.route-tal mockoljuk: a teljes beküldés
// éles adatbázist és külső szolgáltatásokat igényelne. A teszt a 7. (Aláírás) lépésre
// tölt be egy sessionStorage-piszkozatot, így a dátum-mezős 1-3. lépések nem szükségesek.

const DRAFT_KEY = "km:draft:v1"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function openSignatureStep(page: Page) {
  await page.route("**/api/client-log", (route) => route.fulfill({ status: 204 }))
  // Fiktív, nem valós adatokból álló piszkozat a 7. lépésre. Csak az első betöltéskor
  // írjuk be (a későbbi frissítéseknél a böngésző-munkamenet saját piszkozata él).
  await page.addInitScript((key) => {
    if (sessionStorage.getItem("e2e:seeded")) return
    sessionStorage.setItem("e2e:seeded", "1")
    sessionStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        step: 7,
        clientRequestId: "",
        formData: { ownerName: "Teszt Elek", driverSameAsOwner: true, vehiclePlate: "TST-123" },
      })
    )
  }, DRAFT_KEY)
  await page.goto("/form")
  // A talált piszkozatnál a felhasználó dönt: folytatja
  await page.getByRole("button", { name: "Folytatás" }).click()
  await expect(page.getByRole("heading", { name: "Aláírás és beküldés" })).toBeVisible()
}

async function signAndConsent(page: Page) {
  await page.getByRole("button", { name: "Aláírás megnyitása" }).click()
  const canvas = page.getByTestId("signature-canvas")
  await expect(canvas).toBeVisible()
  await settleLayout(page)
  await drawStroke(canvas, wavePoints(30))
  await page.getByRole("button", { name: "Alkalmazom" }).click()
  await expect(page.getByAltText(/aláírás/)).toBeVisible()
  await page.getByRole("checkbox").check()
}

const readDraft = (page: Page) =>
  page.evaluate((key) => {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as { clientRequestId: string; formData: Record<string, string> }) : null
  }, DRAFT_KEY)

test.describe("beküldés: piszkozat és újrapróbálás", () => {
  for (const failure of ["hálózati hiba", "500-as válasz"] as const) {
    test(`újrapróbálás (${failure}) ugyanazzal a clientRequestId-val megy, az aláírás megmarad`, async ({ page }) => {
      const submits: Request[] = []
      await page.route("**/api/submit", async (route) => {
        submits.push(route.request())
        if (submits.length === 1) {
          if (failure === "hálózati hiba") await route.abort("failed")
          else await route.fulfill({ status: 500, json: { error: "Váratlan hiba történt. Kérjük próbálja újra később." } })
          return
        }
        await route.fulfill({ status: 201, json: { success: true, id: "mock-id" } })
      })

      await openSignatureStep(page)
      await signAndConsent(page)
      await page.getByRole("button", { name: "Kárfelvétel beküldése" }).click()

      const retry = page.getByRole("button", { name: "Újrapróbálás" })
      await expect(retry).toBeVisible()
      // az aláírás nem veszett el, a piszkozat is megvan
      await expect(page.getByAltText(/aláírás/)).toBeVisible()
      await expect.poll(async () => (await readDraft(page))?.formData.ownerSignatureUrl?.startsWith("data:image/png")).toBe(true)

      await retry.click()
      await page.waitForURL("**/success")
      expect(submits).toHaveLength(2)

      const bodies = submits.map((r) => r.postDataJSON() as Record<string, string>)
      expect(bodies[0].clientRequestId).toMatch(UUID_RE)
      expect(bodies[1].clientRequestId).toBe(bodies[0].clientRequestId)
      expect(bodies[1].ownerSignatureUrl).toBe(bodies[0].ownerSignatureUrl)
      expect(bodies[1].ownerSignatureUrl.startsWith("data:image/png;base64,")).toBe(true)

      // sikeres beküldés után a piszkozat törlődik
      expect(await readDraft(page)).toBeNull()
    })
  }

  test("a piszkozat (adatok + aláírás + kérés-azonosító) megmarad oldalfrissítés után", async ({ page }) => {
    await openSignatureStep(page)
    await signAndConsent(page)
    await expect.poll(async () => (await readDraft(page))?.formData.ownerSignatureUrl?.startsWith("data:image/png")).toBe(true)
    const before = await readDraft(page)
    expect(before?.clientRequestId).toMatch(UUID_RE)

    await page.reload()
    await page.getByRole("button", { name: "Folytatás" }).click()
    await expect(page.getByRole("heading", { name: "Aláírás és beküldés" })).toBeVisible()
    await expect(page.getByAltText(/aláírás/)).toBeVisible()
    const after = await readDraft(page)
    expect(after?.clientRequestId).toBe(before?.clientRequestId)
    expect(after?.formData.ownerName).toBe("Teszt Elek")
  })

  test("a modal zárolja a body-t (position: fixed), bezáráskor visszaállítja a görgetési pozíciót", async ({ page }) => {
    await openSignatureStep(page)
    await page.evaluate(() => {
      document.body.style.minHeight = "4000px"
      window.scrollTo(0, 300)
    })
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(250)

    await page.getByRole("button", { name: "Aláírás megnyitása" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    const locked = await page.evaluate(() => ({ pos: document.body.style.position, top: document.body.style.top }))
    expect(locked.pos).toBe("fixed")
    expect(parseInt(locked.top, 10)).toBeLessThan(-250)

    await page.getByRole("button", { name: "Mégse" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const unlocked = await page.evaluate(() => ({
      pos: document.body.style.position,
      top: document.body.style.top,
      y: Math.round(window.scrollY),
    }))
    expect(unlocked.pos).toBe("")
    expect(unlocked.top).toBe("")
    expect(unlocked.y).toBeGreaterThan(250)
  })

  test("lejárt piszkozat nem töltődik be, és nem kérdez rá", async ({ page }) => {
    await page.route("**/api/client-log", (route) => route.fulfill({ status: 204 }))
    await page.addInitScript((key) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          savedAt: Date.now() - 31 * 60 * 1000,
          step: 7,
          clientRequestId: "",
          formData: { ownerName: "Régi Ügyfél" },
        })
      )
    }, DRAFT_KEY)
    await page.goto("/form")
    await expect(page.getByRole("button", { name: "Folytatás" })).toHaveCount(0)
    await expect(page.getByText("Digitális Kárfelvételi Űrlap")).toBeVisible()
  })

  test("Új kitöltés: a korábbi piszkozat törlődik, új kérés-azonosító készül", async ({ page }) => {
    await page.route("**/api/client-log", (route) => route.fulfill({ status: 204 }))
    await page.addInitScript((key) => {
      if (sessionStorage.getItem("e2e:seeded")) return
      sessionStorage.setItem("e2e:seeded", "1")
      sessionStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          savedAt: Date.now(),
          step: 7,
          clientRequestId: "11111111-1111-4111-8111-111111111111",
          formData: { ownerName: "Előző Ügyfél" },
        })
      )
    }, DRAFT_KEY)
    await page.goto("/form")
    await expect(page.getByText("Félbehagyott kitöltés található")).toBeVisible()
    await page.getByRole("button", { name: "Új kitöltés" }).click()
    await expect(page.getByText("Digitális Kárfelvételi Űrlap")).toBeVisible()
    await expect.poll(async () => (await readDraft(page))?.formData.ownerName ?? "").not.toBe("Előző Ügyfél")
    const draft = await readDraft(page)
    if (draft) expect(draft.clientRequestId).not.toBe("11111111-1111-4111-8111-111111111111")
  })

  test("hiányzó sessionStorage esetén az űrlap hiba nélkül betölt", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("denied", "SecurityError")
        },
      })
    })
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.route("**/api/client-log", (route) => route.fulfill({ status: 204 }))
    await page.goto("/form")
    await expect(page.getByRole("heading", { name: "Digitális Kárfelvételi Űrlap" })).toBeVisible()
    expect(errors).toEqual([])
  })
})
