import { NextRequest, NextResponse } from "next/server"
import { munkalapSchema } from "@/lib/validation"
import { enforceRateLimit } from "@/lib/ratelimit"
import { sessionCookieName, verifySessionCookieValue } from "@/lib/session"
import { prisma } from "@/lib/db"
import { uploadSignature } from "@/lib/storage"
import { finalizeReport } from "@/lib/finalize"

interface RouteParams {
  params: { id: string }
}

// PATCH — a technikus lezárja a munkalapot: menti az adatokat, majd elindítja a
// PDF + email véglegesítési pipeline-t.
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const munkalapFields = await req.json()

    if (report.status === "COMPLETED") {
      return NextResponse.json(
        { error: "A jegyzőkönyv már le van zárva, nem módosítható" },
        { status: 409 }
      )
    }

    const result = munkalapSchema.safeParse(munkalapFields)
    if (!result.success) {
      return NextResponse.json(
        { error: "Érvénytelen adatok", details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = result.data

    let technicianSigUrl: string
    try {
      technicianSigUrl = await uploadSignature(
        data.technicianSignatureUrl,
        report.vehiclePlate,
        report.id,
        "technician"
      )
    } catch (uploadError) {
      console.error("Technikusi aláírás feltöltési hiba:", uploadError)
      return NextResponse.json(
        { error: "Aláírás feltöltési hiba. Kérjük próbálja újra." },
        { status: 500 }
      )
    }

    // A jegyzőkönyv adatait MINDIG elmentjük, mielőtt a PDF/email pipeline-t megpróbálnánk —
    // így a technikus rögzített munkája sosem veszik el egy esetleges PDF/email hiba esetén.
    await prisma.damageReport.update({
      where: { id: report.id },
      data: {
        vehicleCheckIn: new Date(data.vehicleCheckIn),
        vehicleCheckOut: new Date(data.vehicleCheckOut),
        equipmentChecklist: data.equipmentChecklist,
        damageNotes: data.damageNotes,
        technicianName: data.technicianName,
        technicianSignatureUrl: technicianSigUrl,
      },
    })

    const outcome = await finalizeReport(report.id)
    if (!outcome.ok) {
      return NextResponse.json(
        {
          success: false,
          retryable: true,
          error:
            "A jegyzőkönyv adatai elmentve, de a végleges PDF/email küldés sikertelen volt. Próbálja újra a Retry gombbal.",
        },
        { status: 207 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Jegyzőkönyv lezárva, a végleges dokumentumok kiküldve",
    })
  } catch (error) {
    console.error("Jegyzőkönyv finalize hiba:", error)
    return NextResponse.json(
      { error: "Váratlan hiba történt. Kérjük próbálja újra később." },
      { status: 500 }
    )
  }
}
