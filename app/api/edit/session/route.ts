import { NextRequest, NextResponse } from "next/server"
import { validateEditToken } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/ratelimit"
import { createSessionCookieValue, sessionCookieMaxAge, sessionCookieName } from "@/lib/session"

// GET — az e-mailben kiküldött editToken egyszeri beváltása session cookie-ra.
// Ezután a token sosem jelenik meg újra a böngésző URL-jében/history-jában;
// a /edit/[id] oldal és a PATCH /api/edit a cookie-t fogadja el.
export async function GET(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  const id = req.nextUrl.searchParams.get("id")
  const token = req.nextUrl.searchParams.get("token")

  if (!id || !token) {
    return NextResponse.redirect(new URL("/?error=missing_token", req.url))
  }

  const report = await validateEditToken(id, token)
  if (!report) {
    return NextResponse.redirect(new URL("/?error=invalid_token", req.url))
  }

  const response = NextResponse.redirect(new URL(`/edit/${id}`, req.url))
  response.cookies.set(sessionCookieName("edit", id), createSessionCookieValue(id, "edit"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge("edit"),
  })
  return response
}
