import { NextRequest, NextResponse } from "next/server"
import { munkalapSchema } from "@/lib/validation"
import { validateTechnicianToken } from "@/lib/auth"
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
    const body = await req.json()
    const { token, ...munkalapFields } = body

    if (!token) {
      return NextResponse.json({ error: "Hiányzó token" }, { status: 400 })
    }

    const report = await validateTechnicianToken(params.id, token)
    if (!report) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (report.status === "COMPLETED") {
      return NextResponse.json(
        { error: "A munkalap már le van zárva, nem módosítható" },
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

    // A munkalap adatait MINDIG elmentjük, mielőtt a PDF/email pipeline-t megpróbálnánk —
    // így a technikus rögzített munkája sosem veszik el egy esetleges PDF/email hiba esetén.
    await prisma.damageReport.update({
      where: { id: report.id },
      data: {
        vehicleCheckIn: new Date(data.vehicleCheckIn),
        vehicleCheckOut: new Date(data.vehicleCheckOut),
        mileage: data.mileage,
        workType: data.workType,
        eurocode: data.eurocode,
        materialsUsed: data.materialsUsed,
        materialCost: data.materialCost,
        laborCost: data.laborCost,
        paymentMethod: data.paymentMethod,
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
            "A munkalap adatai elmentve, de a végleges PDF/email küldés sikertelen volt. Próbálja újra a Retry gombbal.",
        },
        { status: 207 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Munkalap lezárva, a végleges dokumentumok kiküldve",
    })
  } catch (error) {
    console.error("Munkalap finalize hiba:", error)
    return NextResponse.json(
      { error: "Váratlan hiba történt. Kérjük próbálja újra később." },
      { status: 500 }
    )
  }
}
