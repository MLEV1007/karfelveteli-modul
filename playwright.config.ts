import { defineConfig, devices } from "@playwright/test"

// E2E tesztek az aláírás-komponenshez és a beküldés-újrapróbáláshoz.
// A /api/* végpontokat a tesztek page.route-tal mockolják, ezért NEM kell éles adatbázis,
// Supabase, Resend vagy Upstash. A webServer alá csak hamis, lokális értékek kerülnek
// (a futtatás idejére, a folyamat környezetébe) — titok nem kerül fájlba.
const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "ipad-gen7-webkit", use: { ...devices["iPad (gen 7)"] } },
    { name: "iphone-14-webkit", use: { ...devices["iPhone 14"] } },
    { name: "pixel-7-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Hamis, lokális értékek — a modulok importálásához kellenek, valódi szolgáltatást nem érnek el
      DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/e2e_fake",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-fake-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "e2e-fake-service-key",
      NEXT_PUBLIC_APP_URL: BASE_URL,
      SESSION_SECRET: "e2e-fake-session-secret-not-a-real-secret",
      RESEND_API_KEY: "e2e-fake",
      WORKSHOP_EMAIL: "workshop@example.invalid",
      EMAIL_FROM: "noreply@example.invalid",
    },
  },
})
