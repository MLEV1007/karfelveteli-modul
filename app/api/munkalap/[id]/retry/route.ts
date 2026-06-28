import { NextRequest, NextResponse } from "next/server"
import { enforceRateLimit } from "@/lib/ratelimit"
import { sessionCookieName, verifySessionCookieValue } from "@/lib/session"
import { prisma } from "@/lib/db"
import { finalizeReport } from "@/lib/finalize"

interface RouteParams {
  params: { id: string }
}

// POST — újrapróbálja a PDF/email véglegesítési pipeline-t egy FAILED_PDF állapotú
// rekordon, anélkül hogy a technikusnak újra be kellene gépelnie a munkalap adatait.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await enforceRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const sessionCookie = req.cookies.get(sessionCookieName("munkalap", params.id))?.value
    if (!verifySessionCookieValue(sessionCookie, params.id, "munkalap")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const report = await prisma.damageReport.findUnique({ where: { id: params.id } })
    if (!report) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (report.status === "PENDING_TECHNICIAN") {
      return NextResponse.json(
        { error: "A munkalap még nincs kitöltve, nincs mit újrapróbálni" },
        { status: 400 }
      )
    }

    const outcome = await finalizeReport(report.id)
    if (!outcome.ok) {
      return NextResponse.json(
        { success: false, error: "A véglegesítés ismét sikertelen volt. Próbálja újra később." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Dokumentumok sikeresen kiküldve" })
  } catch (error) {
    console.error("Munkalap retry hiba:", error)
    return NextResponse.json({ error: "Váratlan hiba történt." }, { status: 500 })
  }
}
