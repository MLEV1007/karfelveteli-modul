import { NextRequest, NextResponse } from "next/server"
import { editReportSchema } from "@/lib/validation"
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
    const result = editReportSchema.safeParse(data)
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

    // 5. Prisma update (csak a validált mezők)
    await prisma.damageReport.update({
      where: { id },
      data: {
        // Step 1
        ownerName: validatedData.ownerName,
        ownerAddress: validatedData.ownerAddress ?? null,
        idOrTaxNumber: validatedData.idOrTaxNumber ?? null,
        driverName: validatedData.driverName ?? null,
        driverAddress: validatedData.driverAddress ?? null,
        driverPhone: validatedData.driverPhone ?? null,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone ?? null,

        // Step 2
        vehiclePlate: validatedData.vehiclePlate,
        vehicleMake: validatedData.vehicleMake,
        vehicleModel: validatedData.vehicleModel,
        vehicleYear: validatedData.vehicleYear ?? null,
        vehicleVin: validatedData.vehicleVin ?? null,
        hasCasco: validatedData.hasCasco,
        cascoInsurer: validatedData.cascoInsurer ?? null,
        liabilityInsurer: validatedData.liabilityInsurer ?? null,
        relevantInsurer: validatedData.relevantInsurer ?? null,
        insuranceCompany: validatedData.insuranceCompany ?? null,
        insuranceCompanyOther: validatedData.insuranceCompanyOther ?? null,

        // Step 3
        accidentDate: validatedData.accidentDate
          ? new Date(validatedData.accidentDate)
          : null,
        accidentCountry: validatedData.accidentCountry ?? null,
        accidentCity: validatedData.accidentCity ?? null,
        accidentStreet: validatedData.accidentStreet ?? null,
        outsideSettlement: validatedData.outsideSettlement,
        roadNumber: validatedData.roadNumber ?? null,
        kilometerMark: validatedData.kilometerMark ?? null,
        policeInvolved: validatedData.policeInvolved,
        policeStation: validatedData.policeStation ?? null,
        otherVehiclePlate: validatedData.otherVehiclePlate ?? null,
        otherVehicleType: validatedData.otherVehicleType ?? null,
        otherVehicleColor: validatedData.otherVehicleColor ?? null,
        additionalParties: validatedData.additionalParties ?? null,
        vehicleInspectionLocation: validatedData.vehicleInspectionLocation ?? null,

        // Step 4
        damageDescription: validatedData.damageDescription ?? null,
        damagePoints: validatedData.damagePoints ?? [],

        // Step 5
        liableParty: validatedData.liableParty ?? null,
        underInfluence: validatedData.underInfluence,
        licenseValid: validatedData.licenseValid,
        vatReclaimEligible: validatedData.vatReclaimEligible,
        taxNumber: validatedData.taxNumber ?? null,
        consentToPhotocopy: validatedData.consentToPhotocopy,
        cascoClaimRequest: validatedData.cascoClaimRequest,
        vehicleEncumbrance: validatedData.vehicleEncumbrance,

        // photoUrls, aláírások, gdprConsent, createdAt, emailSentAt
        // SZÁNDÉKOSAN NINCS FELSOROLVA — readonly mezők
      },
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
