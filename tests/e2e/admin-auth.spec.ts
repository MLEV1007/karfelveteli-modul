import { test, expect, type Page } from "@playwright/test"
import { signAdminToken } from "../../lib/adminToken"

// A playwright.config.ts webServer.env-jében megadott HAMIS titokkal azonos (nem valódi titok).
const FAKE_SECRET = "e2e-fake-admin-session-secret-not-real-0123456789"
const BASE = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`
const ORIGIN = { Origin: BASE }

async function addPendingCookie(page: Page) {
  const value = await signAdminToken("pending", "e2e-admin-id", FAKE_SECRET)
  await page.context().addCookies([{ name: "admin_pending", value, url: BASE }])
}

test.describe("middleware védelem", () => {
  test("bejelentkezés nélkül /admin → /admin/login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(page.getByRole("heading", { name: "Admin bejelentkezés" })).toBeVisible()
  })

  test("bejelentkezés nélkül védett admin oldalak → /admin/login", async ({ page }) => {
    await page.goto("/admin/reports/valami")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("hamisított / más típusú / hibás aláírású cookie nem enged be", async ({ page, request }) => {
    const pending = await signAdminToken("pending", "x", FAKE_SECRET)
    const wrongSecret = await signAdminToken("session", "x", "another-fake-secret-0123456789abcdefghijk")
    for (const value of [pending, wrongSecret, "garbage", pending.split(".")[0] + ".AAAA"]) {
      await page.context().clearCookies()
      await page.context().addCookies([{ name: "admin_session", value, url: BASE }])
      await page.goto("/admin")
      await expect(page).toHaveURL(/\/admin\/login$/)
      const res = await request.get("/api/admin/reports", { headers: { Cookie: `admin_session=${value}` } })
      expect(res.status()).toBe(401)
    }
  })

  test("/api/admin/... → 401 JSON, no-store, noindex", async ({ request }) => {
    const res = await request.get("/api/admin/reports")
    expect(res.status()).toBe(401)
    expect(await res.json()).toEqual({ error: "Nincs bejelentkezve." })
    expect(res.headers()["cache-control"]).toContain("no-store")
    expect(res.headers()["x-robots-tag"]).toContain("noindex")
  })

  test("mutáló admin API Origin nélkül / idegen Origin-nel → 403, egyező Origin-nel tovább (401)", async ({ request }) => {
    expect((await request.post("/api/admin/reports")).status()).toBe(403)
    expect((await request.delete("/api/admin/reports/1", { headers: { Origin: "https://evil.example.invalid" } })).status()).toBe(403)
    expect((await request.post("/api/admin/reports", { headers: ORIGIN })).status()).toBe(401)
  })

  test("érvényes aláírású session cookie átengedi a middleware-t (az oldal DB-ellenőrzése ettől még külön van)", async ({ request }) => {
    const value = await signAdminToken("session", "e2e-admin-id", FAKE_SECRET)
    const res = await request.get("/api/admin/valami-ami-nincs", { headers: { Cookie: `admin_session=${value}` } })
    expect(res.status()).toBe(404) // a middleware nem utasította el: a route nem létezik
  })

  test("a login oldalak és az admin válaszok no-store / noindex fejlécet kapnak", async ({ request }) => {
    for (const path of ["/admin/login", "/admin"]) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.headers()["cache-control"]).toContain("no-store")
      expect(res.headers()["x-robots-tag"]).toContain("noindex")
    }
  })

  test("/admin/munkalap/* NEM irányít a login oldalra (érvénytelen token → főoldal, ahogy eddig)", async ({ page, request }) => {
    await page.goto("/admin/munkalap/valami")
    await expect(page).not.toHaveURL(/\/admin\/login/)
    await expect(page).toHaveURL(/\/\?error=invalid_token$/)

    const res = await request.get("/admin/munkalap/valami", { maxRedirects: 0 })
    expect(res.status()).not.toBe(401)
    expect(res.headers()["location"] ?? "").not.toContain("/admin/login")
    expect(res.headers()["x-robots-tag"]).toBeUndefined() // a nyilvános oldalt a middleware nem módosítja
  })

  test("a nem admin útvonalakat a middleware nem érinti", async ({ request }) => {
    // /api/munkalap/session: hiányzó paraméterek → a saját redirectje, nem 401/403
    const res = await request.get("/api/munkalap/session", { maxRedirects: 0 })
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(400)
    expect(res.headers()["location"]).toContain("error=missing_token")
    expect(res.headers()["x-robots-tag"]).toBeUndefined()
    // /api/submit és /api/edit: nem admin-védelem (401 admin-üzenettel) válaszol
    for (const path of ["/api/submit", "/api/edit"]) {
      const r = await request.post(path, { data: {} })
      const text = await r.text()
      expect(text).not.toContain("Nincs bejelentkezve")
      expect(r.status()).not.toBe(403)
    }
  })
})

test.describe("auth API (DB nélkül elérhető ágak)", () => {
  test("login: Origin nélkül 403; hibás törzs 400 egységes üzenettel", async ({ request }) => {
    expect((await request.post("/api/admin/auth/login", { data: { email: "a@b.hu", password: "x" } })).status()).toBe(403)
    const bad = await request.post("/api/admin/auth/login", { headers: ORIGIN, data: { nincs: true } })
    expect(bad.status()).toBe(400)
    expect(await bad.json()).toEqual({ error: "Hibás adatok" })
  })

  test("2fa: érvényes pending cookie nélkül 401 + expired kód; Origin nélkül 403", async ({ request }) => {
    expect((await request.post("/api/admin/auth/2fa", { data: { code: "123456" } })).status()).toBe(403)
    const res = await request.post("/api/admin/auth/2fa", { headers: ORIGIN, data: { code: "123456" } })
    expect(res.status()).toBe(401)
    expect((await res.json()).code).toBe("expired")
  })

  test("logout: Origin nélkül 403; Origin-nel 200 és törli a sütiket", async ({ request }) => {
    expect((await request.post("/api/admin/auth/logout")).status()).toBe(403)
    const res = await request.post("/api/admin/auth/logout", { headers: ORIGIN })
    expect(res.status()).toBe(200)
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value)
    expect(cookies.some((c) => c.startsWith("admin_session=") && /Max-Age=0/i.test(c))).toBe(true)
    expect(cookies.some((c) => c.startsWith("admin_pending=") && /Max-Age=0/i.test(c))).toBe(true)
  })
})

test.describe("login oldal (mockolt API)", () => {
  test("hibás adatok: egységes hibaüzenet, a jelszó mező kiürül", async ({ page }) => {
    await page.route("**/api/admin/auth/login", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Hibás adatok" }) })
    )
    await page.goto("/admin/login")
    await page.getByLabel("E-mail cím").fill("admin@example.invalid")
    await page.getByLabel("Jelszó").fill("nem-jo-jelszo-1234")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page.locator("p[role=alert]")).toHaveText("Hibás adatok")
    await expect(page.getByLabel("Jelszó")).toHaveValue("")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("sikeres jelszó → /admin/login/2fa, a kérés törzse helyes", async ({ page }) => {
    await addPendingCookie(page)
    let body: unknown = null
    await page.route("**/api/admin/auth/login", (route) => {
      body = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, next: "/admin/login/2fa" }) })
    })
    await page.goto("/admin/login")
    await page.getByLabel("E-mail cím").fill("admin@example.invalid")
    await page.getByLabel("Jelszó").fill("helyes-jelszo-teszt-1234")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page).toHaveURL(/\/admin\/login\/2fa$/)
    expect(body).toEqual({ email: "admin@example.invalid", password: "helyes-jelszo-teszt-1234" })
  })

  test("429 / 503 hibaüzenet megjelenik", async ({ page }) => {
    await page.route("**/api/admin/auth/login", (route) =>
      route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Túl sok próbálkozás. Kérjük, próbálja újra később." }) })
    )
    await page.goto("/admin/login")
    await page.getByLabel("E-mail cím").fill("admin@example.invalid")
    await page.getByLabel("Jelszó").fill("valami-jelszo-1234567")
    await page.getByRole("button", { name: "Tovább" }).click()
    await expect(page.locator("p[role=alert]")).toContainText("Túl sok próbálkozás")
  })

  test("a mezők attribútumai és a billentyűzetes elérhetőség", async ({ page }) => {
    await page.goto("/admin/login")
    await expect(page.getByLabel("Jelszó")).toHaveAttribute("type", "password")
    await expect(page.getByLabel("Jelszó")).toHaveAttribute("autocomplete", "current-password")
    await expect(page.getByLabel("E-mail cím")).toHaveAttribute("autocomplete", "username")
    await expect(page.getByRole("button", { name: "Tovább" })).toBeDisabled()
    await page.getByLabel("E-mail cím").fill("admin@example.invalid")
    await page.getByLabel("Jelszó").fill("valami-jelszo-1234567")
    await expect(page.getByRole("button", { name: "Tovább" })).toBeEnabled()
  })
})

test.describe("2FA oldal (mockolt API)", () => {
  test("érvényes pending cookie nélkül → /admin/login", async ({ page }) => {
    await page.goto("/admin/login/2fa")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("TOTP űrlap attribútumai, hibás kód, majd siker → /admin", async ({ page }) => {
    await addPendingCookie(page)
    const bodies: unknown[] = []
    await page.route("**/api/admin/auth/2fa", (route) => {
      const body = route.request().postDataJSON()
      bodies.push(body)
      if (body.code === "111111") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, next: "/admin" }) })
      }
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Hibás adatok" }) })
    })
    // A cél oldal (DB nélkül nem renderelhető) mockolása: csak az átirányítás megtörténtét ellenőrizzük
    await page.route(/\/admin$/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Bejelentkezve</h1>" })
    )

    await page.goto("/admin/login/2fa")
    const input = page.getByLabel("6 jegyű kód")
    await expect(input).toHaveAttribute("inputmode", "numeric")
    await expect(input).toHaveAttribute("autocomplete", "one-time-code")
    await expect(input).toBeFocused()
    await expect(page.getByRole("button", { name: "Bejelentkezés" })).toBeDisabled()

    await input.fill("12ab34cd56")
    await expect(input).toHaveValue("123456") // csak számjegyek, max. 6
    await page.getByRole("button", { name: "Bejelentkezés" }).click()
    await expect(page.locator("p[role=alert]")).toHaveText("Hibás adatok")
    await expect(input).toHaveValue("")

    await input.fill("111111")
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole("heading", { name: "Bejelentkezve" })).toBeVisible()
    expect(bodies).toEqual([{ code: "123456" }, { code: "111111" }])
  })

  test("helyreállító kód váltó", async ({ page }) => {
    await addPendingCookie(page)
    let body: unknown = null
    await page.route("**/api/admin/auth/2fa", (route) => {
      body = route.request().postDataJSON()
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Hibás adatok" }) })
    })
    await page.goto("/admin/login/2fa")
    await page.getByRole("button", { name: "Helyreállító kód használata" }).click()
    const input = page.getByLabel("Helyreállító kód")
    await expect(input).toBeVisible()
    await expect(input).not.toHaveAttribute("inputmode", "numeric")
    await input.fill("abcd-ef23")
    await expect(input).toHaveValue("ABCD-EF23")
    await page.getByRole("button", { name: "Bejelentkezés" }).click()
    await expect(page.locator("p[role=alert]")).toHaveText("Hibás adatok")
    expect(body).toEqual({ code: "ABCD-EF23" })

    await page.getByRole("button", { name: "Vissza a hitelesítő alkalmazás kódjához" }).click()
    await expect(page.getByLabel("6 jegyű kód")).toBeVisible()
    await expect(page.locator("p[role=alert]")).toHaveCount(0)
  })

  test("lejárt pending (API: expired) → vissza a bejelentkezéshez", async ({ page }) => {
    await addPendingCookie(page)
    await page.route("**/api/admin/auth/2fa", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "A bejelentkezés lejárt.", code: "expired" }) })
    )
    await page.goto("/admin/login/2fa")
    await page.getByLabel("6 jegyű kód").fill("123456")
    await page.getByRole("button", { name: "Bejelentkezés" }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})
