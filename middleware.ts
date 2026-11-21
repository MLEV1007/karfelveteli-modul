// Admin védelem (Edge runtime): /admin/** és /api/admin/**.
// Az aláírt session cookie-t Web Crypto HMAC-pal ellenőrzi (nincs DB-hívás); a DB-s mélységi védelem a
// route handlerekben (requireAdminApi) és az oldalakon (requireAdminPage) van.
// KIVÉTELEK: /admin/login, /admin/login/2fa, /api/admin/auth/* (session nélkül elérhetők),
// /admin/munkalap/* (nyilvános tokenes technikusi oldal — a middleware semmit nem módosít rajta).
import { NextResponse, type NextRequest } from "next/server"
import { classifyAdminPath } from "./lib/adminRoutes"
import { checkMutationOrigin } from "./lib/adminCsrf"
import { ADMIN_SESSION_COOKIE, getAdminSessionSecret, verifyAdminToken } from "./lib/adminToken"

function withAdminHeaders(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store")
  res.headers.set("X-Robots-Tag", "noindex, nofollow")
  return res
}

function json(body: unknown, status: number): NextResponse {
  return withAdminHeaders(NextResponse.json(body, { status }))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const cls = classifyAdminPath(pathname)

  // A nyilvános technikusi oldal változatlanul, fejléc-módosítás nélkül megy tovább.
  if (cls === "public-munkalap") return NextResponse.next()

  if (cls === "auth-open") return withAdminHeaders(NextResponse.next())

  const isApi = pathname.startsWith("/api/")

  // CSRF mélységi védelem: mutáló kérésnél kötelező, egyező Origin
  if (isApi && !checkMutationOrigin(req.method, req.headers, process.env.NEXT_PUBLIC_APP_URL)) {
    return json({ error: "Érvénytelen kérés." }, 403)
  }

  const redirectToLogin = () => {
    const url = req.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search = ""
    return withAdminHeaders(NextResponse.redirect(url))
  }

  const secret = getAdminSessionSecret()
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET hiányzik vagy túl rövid — az admin felület le van tiltva.")
    return isApi ? json({ error: "A szolgáltatás átmenetileg nem elérhető." }, 503) : redirectToLogin()
  }

  const token = await verifyAdminToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value, "session", secret)
  if (!token) {
    return isApi ? json({ error: "Nincs bejelentkezve." }, 401) : redirectToLogin()
  }

  return withAdminHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
