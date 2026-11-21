import { NextRequest, NextResponse } from "next/server"
import { pickEditSchema, buildEditUpdateData } from "@/lib/editReportData"
import { enforceRateLimit } from "@/lib/ratelimit"
import { sessionCookieName, verifySessionCookieValue } from "@/lib/session"
import { prisma } from "@/lib/db"
import { finalizeReport } from "@/lib/finalize"

export async function PATCH(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResponse = await enforceRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    // 2. Request body parse
    const body = await req.json()

    // Kinyerjük az id-t a body-ból
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó azonosító" },
        { status: 400 }
      )
    }

    // 3. Session cookie validáció (a nyers tokent a /api/edit/session
    // csere-endpoint már egyszer beváltotta cookie-ra — ide csak az kell)
    const sessionCookie = req.cookies.get(sessionCookieName("edit", id))?.value
    if (!verifySessionCookieValue(sessionCookie, id, "edit")) {
      // Egységes 401 — ne árulja el, hogy létezik-e vagy lejárt-e
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const report = await prisma.damageReport.findUnique({ where: { id } })
    if (!report) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 4. Zod validáció (strict mode — csak engedélyezett mezők)
    // Régi (szélvédő-ok nélkül beküldött) szélvédős rekord: ha a kérés sem küld okot, az ok
    // nem kötelező és null marad — így a korábbi rekordok változatlanul szerkeszthetők.
    const result = pickEditSchema(report, data).safeParse(data)
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Érvénytelen adatok",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const validatedData = result.data

    // 5. Prisma update (csak a validált mezők; a közös leképezés a lib/editReportData.ts-ben van —
    // photoUrls, aláírások, gdprConsent, createdAt, emailSentAt SZÁNDÉKOSAN nincs felsorolva)
    await prisma.damageReport.update({
      where: { id },
      data: buildEditUpdateData(validatedData),
    })

    // 6. Ha a jegyzőkönyv már lezárva volt (COMPLETED), a szerkesztés miatt a korábban
    // kiküldött PDF/email elavulttá vált — újrageneráljuk és újraküldjük mindkét félnek.
    if (report.status === "COMPLETED") {
      const outcome = await finalizeReport(id, { force: true })
      if (!outcome.ok) {
        return NextResponse.json(
          {
            success: false,
            retryable: true,
            error:
              "A módosítások elmentve, de a frissített PDF/email kiküldése sikertelen volt. Próbálja újra később.",
          },
          { status: 207 }
        )
      }
    }

    // 7. Sikeres válasz
    return NextResponse.json(
      {
        success: true,
        message: "Módosítások sikeresen mentve",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Edit endpoint error:", error)
    return NextResponse.json(
      { error: "Váratlan hiba történt. Kérjük próbálja újra később." },
      { status: 500 }
    )
  }
}
