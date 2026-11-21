import { test, expect } from "@playwright/test"
import { signAdminToken } from "../../lib/adminToken"

// A playwright.config.ts webServer.env-jében megadott HAMIS titokkal azonos (nem valódi titok).
const FAKE_SECRET = "e2e-fake-admin-session-secret-not-real-0123456789"
const BASE = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`
const ORIGIN = { Origin: BASE }

const PROTECTED_PAGES = [
  "/admin/kitoltesek/x",
  "/admin/kitoltesek/x/szerkesztes",
  "/admin/tanuk",
  "/admin?q=abc&status=FAILED_PDF&page=2",
]

test.describe("admin panel: védelem bejelentkezés nélkül", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} → /admin/login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/admin\/login$/)
      await expect(page.getByRole("heading", { name: "Admin bejelentkezés" })).toBeVisible()
    })
  }

  test("GET /api/admin/tanuk → 401 JSON", async ({ request }) => {
    const res = await request.get("/api/admin/tanuk")
    expect(res.status()).toBe(401)
    expect(await res.json()).toEqual({ error: "Nincs bejelentkezve." })
  })

  test("minden mutáló admin API session nélkül 401, Origin nélkül 403", async ({ request }) => {
    const calls: { method: "post" | "patch" | "delete"; url: string }[] = [
      { method: "post", url: "/api/admin/tanuk" },
      { method: "patch", url: "/api/admin/tanuk/x" },
      { method: "delete", url: "/api/admin/tanuk/x" },
      { method: "patch", url: "/api/admin/kitoltesek/x" },
      { method: "post", url: "/api/admin/kitoltesek/x/ujragenerals" },
      { method: "post", url: "/api/admin/kitoltesek/x/technikus-link" },
      { method: "post", url: "/api/admin/kitoltesek/x/ujraprobalas" },
    ]
    for (const c of calls) {
      const noOrigin = await request[c.method](c.url, { data: {} })
      expect(noOrigin.status(), `${c.method} ${c.url} (Origin nélkül)`).toBe(403)
      const evil = await request[c.method](c.url, { data: {}, headers: { Origin: "https://evil.example.invalid" } })
      expect(evil.status(), `${c.method} ${c.url} (idegen Origin)`).toBe(403)
      const noSession = await request[c.method](c.url, { data: {}, headers: ORIGIN })
      expect(noSession.status(), `${c.method} ${c.url} (session nélkül)`).toBe(401)
    }
  })
})

test.describe("admin panel: aláírt (de DB-ben nem ellenőrizhető) session", () => {
  // Az érvényes aláírású cookie átmegy a middleware-en, de az oldal/route DB-ből is ellenőrzi az admint.
  // A hamis DB nem érhető el, ezért a védelem fail-closed: oldalon a login, API-n 503 — soha nem tartalom.
  test("oldalak a loginra irányítanak, ha az admin nem ellenőrizhető", async ({ page }) => {
    const value = await signAdminToken("session", "e2e-admin-id", FAKE_SECRET)
    await page.context().addCookies([{ name: "admin_session", value, url: BASE }])
    for (const path of ["/admin", "/admin/tanuk", "/admin/kitoltesek/x"]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/admin\/login$/)
    }
  })

  test("API: fail-closed 503 (nem 200, nem adat)", async ({ request }) => {
    const value = await signAdminToken("session", "e2e-admin-id", FAKE_SECRET)
    const headers = { Cookie: `admin_session=${value}`, ...ORIGIN }
    const get = await request.get("/api/admin/tanuk", { headers })
    expect(get.status()).toBe(503)
    const patch = await request.patch("/api/admin/kitoltesek/x", { headers, data: {} })
    expect(patch.status()).toBe(503)
    const post = await request.post("/api/admin/kitoltesek/x/ujragenerals", { headers, data: {} })
    expect(post.status()).toBe(503)
  })
})

test.describe("biztonsági fejlécek", () => {
  const expected = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
  }

  test("admin oldalak és API-k: nosniff, no-referrer, X-Frame-Options DENY (+ no-store, noindex)", async ({ request }) => {
    for (const path of ["/admin/login", "/admin", "/admin/tanuk", "/api/admin/tanuk"]) {
      const res = await request.get(path, { maxRedirects: 0 })
      const h = res.headers()
      for (const [k, v] of Object.entries(expected)) expect(h[k], `${path} ${k}`).toBe(v)
      expect(h["cache-control"], path).toContain("no-store")
      expect(h["x-robots-tag"], path).toContain("noindex")
    }
  })

  test("a meglévő fejlécek nem tűntek el (/edit, /api/edit/session: no-referrer)", async ({ request }) => {
    for (const path of ["/edit/valami", "/api/edit/session"]) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.headers()["referrer-policy"], path).toBe("no-referrer")
    }
  })

  test("a nyilvános technikusi oldal továbbra sem kér admin sessiont", async ({ page }) => {
    await page.goto("/admin/munkalap/valami")
    await expect(page).toHaveURL(/\/\?error=invalid_token$/)
  })
})
