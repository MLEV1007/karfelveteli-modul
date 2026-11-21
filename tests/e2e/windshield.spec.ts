import { test, expect, type Page } from "@playwright/test"

// Piszkozatból a 4. lépésre töltve (fiktív adatok) — a 1-3. lépés kitöltése nem szükséges.
const DRAFT_KEY = "km:draft:v1"
const KAVICS_REPAIR =
  "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a sérülés javítható."
const KAVICS_REPLACE =
  "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a szélvédő cseréje szükséges."

async function openStep4(page: Page) {
  await page.route("**/api/client-log", (route) => route.fulfill({ status: 204 }))
  await page.addInitScript((key) => {
    if (sessionStorage.getItem("e2e:seeded")) return
    sessionStorage.setItem("e2e:seeded", "1")
    sessionStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        step: 4,
        clientRequestId: "",
        formData: { ownerName: "Teszt Elek", vehiclePlate: "TST-123" },
      })
    )
  }, DRAFT_KEY)
  await page.goto("/form")
  await page.getByRole("button", { name: "Folytatás" }).click()
  await expect(page.getByRole("heading", { name: "Kár leírása és sérülés jelölése" })).toBeVisible()
}

const description = (page: Page) => page.locator("textarea[name=damageDescription]")

test.describe("szélvédő-ok választó (4. lépés)", () => {
  test("csak szélvédős típusnál jelenik meg, előre kiválasztott érték nélkül", async ({ page }) => {
    await openStep4(page)
    await expect(page.getByText("A kárt okozó esemény")).toHaveCount(0)
    await page.getByText("Szélvédőjavítás", { exact: true }).click()
    await expect(page.getByText("A kárt okozó esemény")).toBeVisible()
    for (const label of ["Felpattanó kavics", "Madár", "Idegen tárgy", "Egyéb"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.locator("input[name=windshieldCause]:checked")).toHaveCount(0)
    await page.getByText("Egyéb kár (szabad leírás)").click()
    await expect(page.getByText("A kárt okozó esemény")).toHaveCount(0)
  })

  test("ok nélkül nem lehet tovább; hibaüzenet jelenik meg", async ({ page }) => {
    await openStep4(page)
    await page.getByText("Szélvédőcsere", { exact: true }).click()
    await description(page).fill("Elég hosszú, saját leírás a káresemény körülményeiről.")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page.getByText("Válassza ki a kárt okozó eseményt")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Kár leírása és sérülés jelölése" })).toBeVisible()
  })

  test("a leírás sablonja követi az okot, a saját szöveg megmarad", async ({ page }) => {
    await openStep4(page)
    await page.getByText("Szélvédőjavítás", { exact: true }).click()
    await page.getByText("Felpattanó kavics", { exact: true }).click()
    await expect(description(page)).toHaveValue(KAVICS_REPAIR)
    // típusváltás: a KAVICS sablon az új típushoz igazodik
    await page.getByText("Szélvédőcsere", { exact: true }).click()
    await expect(description(page)).toHaveValue(KAVICS_REPLACE)
    // ok váltás: másik sablon
    await page.getByText("Madár", { exact: true }).click()
    await expect(description(page)).toHaveValue(/madár/)
    // egyéb: sablon törlődik, szabad szöveg mező kötelező
    await page.getByText("Egyéb", { exact: true }).click()
    await expect(description(page)).toHaveValue("")
    await expect(page.getByLabel(/Írja le a káresemény pontos körülményeit/)).toBeVisible()
    // saját szöveg: ok váltásnál nem íródik felül
    const own = "Saját leírás: a kavics a bal oldalon csillagtörést okozott."
    await description(page).fill(own)
    await page.getByText("Idegen tárgy", { exact: true }).click()
    await expect(description(page)).toHaveValue(own)
  })

  test("Egyéb ok: a szabad szöveg kötelező, kitöltve továbbenged", async ({ page }) => {
    await openStep4(page)
    await page.getByText("Szélvédőjavítás", { exact: true }).click()
    await page.getByText("Egyéb", { exact: true }).click()
    await description(page).fill("Elég hosszú, saját leírás a káresemény körülményeiről.")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page.getByText("Írja le a káresemény pontos körülményeit").last()).toBeVisible()
    await page.getByLabel(/Írja le a káresemény pontos körülményeit/).fill("Fűnyíróból kirepülő kő")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page.getByRole("heading", { name: "Kár leírása és sérülés jelölése" })).toHaveCount(0)
  })
})
