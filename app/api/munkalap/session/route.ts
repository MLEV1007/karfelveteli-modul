import { NextRequest, NextResponse } from "next/server"
import { validateTechnicianToken } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/ratelimit"
import { createSessionCookieValue, sessionCookieMaxAge, sessionCookieName } from "@/lib/session"

// GET — az e-mailben kiküldött technicianToken egyszeri beváltása session
// cookie-ra. Ezután a token sosem jelenik meg újra a böngésző URL-jében/
// history-jában; a /admin/munkalap/[id] oldal és a PATCH/retry API a cookie-t
// fogadja el.
export async function GET(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const id = req.nextUrl.searchParams.get("id")
  const token = req.nextUrl.searchParams.get("token")

  if (!id || !token) {
    return NextResponse.redirect(new URL("/?error=missing_token", req.url))
  }

  const report = await validateTechnicianToken(id, token)
  if (!report) {
    return NextResponse.redirect(new URL("/?error=invalid_token", req.url))
  }

  const response = NextResponse.redirect(new URL(`/admin/munkalap/${id}`, req.url))
  response.cookies.set(sessionCookieName("munkalap", id), createSessionCookieValue(id, "munkalap"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge("munkalap"),
  })
  return response
}
