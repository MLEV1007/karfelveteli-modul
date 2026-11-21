import { test, expect, type Locator, type Page } from "@playwright/test"

// Az /dev/datefield tesztoldalra támaszkodik (csak dev szerveren elérhető,
// production buildben notFound()).

const group = (page: Page, name: string) => page.getByRole("group", { name, exact: true })

const part = (g: Locator, label: "év" | "hónap" | "nap" | "óra" | "perc") =>
  g.getByLabel(label, { exact: true })

async function paste(input: Locator, text: string) {
  await input.focus()
  await input.evaluate((el, t) => {
    const dt = new DataTransfer()
    dt.setData("text/plain", t)
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }))
  }, text)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/datefield")
})

test.describe("DateField", () => {
  test("8 jegyű dátum gépelése kurzormozgatás nélkül a helyes mezőkbe kerül", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("20261121")
    await expect(part(g, "év")).toHaveValue("2026")
    await expect(part(g, "hónap")).toHaveValue("11")
    await expect(part(g, "nap")).toHaveValue("21")
    await expect(page.getByTestId("date-value")).toHaveText("2026-11-21")
  })

  test("a mezők beviteli attribútumai és a magyar placeholderek", async ({ page }) => {
    const g = group(page, "Dátum")
    for (const [label, ph] of [["év", "ÉÉÉÉ"], ["hónap", "HH"], ["nap", "NN"]] as const) {
      const el = part(g, label)
      await expect(el).toHaveAttribute("inputmode", "numeric")
      await expect(el).toHaveAttribute("pattern", "[0-9]*")
      await expect(el).toHaveAttribute("enterkeyhint", "next")
      await expect(el).toHaveAttribute("autocomplete", "off")
      await expect(el).toHaveAttribute("placeholder", ph)
    }
  })

  test("az év legfeljebb 4 számjegy, a nem számjegyek kiszűrődnek", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("20a2")
    await expect(part(g, "év")).toHaveValue("202")
    await page.keyboard.type("67")
    // a 4. számjegy után a hónapra ugrott, az 5. már oda kerül
    await expect(part(g, "év")).toHaveValue("2026")
    await expect(part(g, "hónap")).toHaveValue("07") // első számjegy > 1: 0-val kiegészülve
  })

  test("a hónap és a nap első számjegye alapján azonnal ugrik, egy számjegy 0-val egészül ki", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("2026")
    await page.keyboard.type("3") // > 1: azonnal a napra ugrik
    await expect(part(g, "hónap")).toHaveValue("03")
    await expect(part(g, "nap")).toBeFocused()
    await page.keyboard.type("1") // <= 3: marad
    await expect(part(g, "nap")).toBeFocused()
    await part(g, "nap").blur()
    await expect(part(g, "nap")).toHaveValue("01")
    await expect(page.getByTestId("date-value")).toHaveText("2026-03-01")

    await part(g, "nap").fill("")
    await part(g, "nap").click()
    await page.keyboard.type("5") // > 3: kész kétjegyű
    await expect(part(g, "nap")).toHaveValue("05")

    await part(g, "hónap").fill("1")
    await part(g, "hónap").blur()
    await expect(part(g, "hónap")).toHaveValue("01")
  })

  test("beillesztés: ÉÉÉÉ-HH-NN, ÉÉÉÉ.HH.NN. és ÉÉÉÉHHNN", async ({ page }) => {
    const g = group(page, "Dátum")
    for (const text of ["2026-11-21", "2026.11.21.", "2026. 11. 21.", "20261121"]) {
      await part(g, "év").fill("")
      await part(g, "hónap").fill("")
      await part(g, "nap").fill("")
      await paste(part(g, "év"), text)
      await expect(part(g, "év")).toHaveValue("2026")
      await expect(part(g, "hónap")).toHaveValue("11")
      await expect(part(g, "nap")).toHaveValue("21")
      await expect(page.getByTestId("date-value")).toHaveText("2026-11-21")
    }
  })

  test("backspace üres mezőben az előző mezőre lép", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("202611")
    await expect(part(g, "nap")).toBeFocused()
    await page.keyboard.press("Backspace") // üres nap -> hónap
    await expect(part(g, "hónap")).toBeFocused()
    await expect(part(g, "hónap")).toHaveValue("11")
    await page.keyboard.press("Backspace") // törli a hónap utolsó számjegyét
    await expect(part(g, "hónap")).toHaveValue("1")
    await page.keyboard.press("Backspace")
    await expect(part(g, "hónap")).toHaveValue("")
    await page.keyboard.press("Backspace") // üres hónap -> év
    await expect(part(g, "év")).toBeFocused()
    await expect(part(g, "év")).toHaveValue("2026")
  })

  test("szökőév: 2024-02-29 érvényes, 2025-02-29 nem", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("20240229")
    await expect(page.getByTestId("date-value")).toHaveText("2024-02-29")
    await expect(page.getByText(/legfeljebb \d+ nap van/)).toHaveCount(0)

    await part(g, "év").fill("")
    await part(g, "hónap").fill("")
    await part(g, "nap").fill("")
    await part(g, "év").click()
    await page.keyboard.type("20250229")
    await expect(page.getByTestId("date-value")).toHaveText("invalid")
    await expect(page.getByText("Ebben a hónapban legfeljebb 28 nap van")).toBeVisible()
  })

  test("érvénytelen hónap és évtartomány", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("20261301")
    await expect(page.getByTestId("date-value")).toHaveText("invalid")
    await expect(page.getByText("A hónap 1 és 12 között legyen")).toBeVisible()

    await paste(part(g, "év"), "1899-05-05")
    await expect(page.getByTestId("date-value")).toHaveText("invalid")
    await expect(page.getByText("Az évszám 1900 és 2099 között legyen")).toBeVisible()
  })

  test("hiányos dátum érvénytelen-jelzőt ad (nem megy át a Zod-on), kilépéskor hibát mutat", async ({ page }) => {
    const g = group(page, "Dátum")
    await part(g, "év").click()
    await page.keyboard.type("2026")
    await expect(page.getByTestId("date-value")).toHaveText("invalid")
    await page.locator("body").click({ position: { x: 5, y: 5 } })
    await expect(page.getByText("Hiányos dátum")).toBeVisible()
  })
})

test.describe("DateTimeField", () => {
  test("12 jegyű időpont gépelése a helyes mezőkbe kerül", async ({ page }) => {
    const g = group(page, "Időpont")
    await part(g, "év").click()
    await page.keyboard.type("202611211430")
    await expect(part(g, "év")).toHaveValue("2026")
    await expect(part(g, "hónap")).toHaveValue("11")
    await expect(part(g, "nap")).toHaveValue("21")
    await expect(part(g, "óra")).toHaveValue("14")
    await expect(part(g, "perc")).toHaveValue("30")
    await expect(page.getByTestId("datetime-value")).toHaveText("2026-11-21T14:30")
  })

  test("a nap első számjegye > 3 esetén az órára ugrik", async ({ page }) => {
    const g = group(page, "Időpont")
    await part(g, "év").click()
    await page.keyboard.type("2026114")
    await expect(part(g, "nap")).toHaveValue("04")
    await expect(part(g, "óra")).toBeFocused()
  })

  test("beillesztés: ÉÉÉÉ-HH-NNTÓÓ:PP", async ({ page }) => {
    const g = group(page, "Időpont")
    await paste(part(g, "év"), "2026-11-21T14:30")
    await expect(part(g, "óra")).toHaveValue("14")
    await expect(part(g, "perc")).toHaveValue("30")
    await expect(page.getByTestId("datetime-value")).toHaveText("2026-11-21T14:30")
  })

  test("backspace üres percmezőben az órára lép", async ({ page }) => {
    const g = group(page, "Időpont")
    await part(g, "év").click()
    await page.keyboard.type("2026112114")
    await expect(part(g, "perc")).toBeFocused()
    await page.keyboard.press("Backspace")
    await expect(part(g, "óra")).toBeFocused()
  })

  test("érvénytelen óra / perc", async ({ page }) => {
    const g = group(page, "Időpont")
    await paste(part(g, "év"), "2026-11-21T24:00")
    await expect(page.getByTestId("datetime-value")).toHaveText("invalid")
    await expect(page.getByText("Az óra 0 és 23 között legyen")).toBeVisible()
  })

  test("szökőév időponttal", async ({ page }) => {
    const g = group(page, "Időpont")
    await paste(part(g, "év"), "2024-02-29T12:00")
    await expect(page.getByTestId("datetime-value")).toHaveText("2024-02-29T12:00")
    await paste(part(g, "év"), "2025-02-29T12:00")
    await expect(page.getByTestId("datetime-value")).toHaveText("invalid")
  })

  test("jövőbeli időpont elutasítva (baleset időpontja), múltbeli elfogadva", async ({ page }) => {
    const g = group(page, "Baleset időpontja")
    await paste(part(g, "év"), "2099-01-01T10:00")
    await expect(page.getByTestId("accident-value")).toHaveText("invalid")
    await expect(page.getByText("Az időpont nem lehet jövőbeli")).toBeVisible()

    await paste(part(g, "év"), "2024-02-29T10:00")
    await expect(page.getByTestId("accident-value")).toHaveText("2024-02-29T10:00")
    await expect(page.getByText("Az időpont nem lehet jövőbeli")).toHaveCount(0)
  })

  test("a jövőbeli korlát nélküli mező elfogadja a jövőbeli időpontot", async ({ page }) => {
    const g = group(page, "Időpont")
    await paste(part(g, "év"), "2099-01-01T10:00")
    await expect(page.getByTestId("datetime-value")).toHaveText("2099-01-01T10:00")
  })
})
