import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { damageReportSchema } from "@/lib/validation"
import { enforceRateLimit } from "@/lib/ratelimit"
import { prisma } from "@/lib/db"
import { sendCustomerSubmissionEmail, sendTechnicianNotification } from "@/lib/email"
import { uploadSignature } from "@/lib/storage"

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResponse = await enforceRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    // 2. Request body parse
    const body = await req.json()

    // 3. Zod validáció — ügyfél oldali mezők (a munkalap technikusi mezői NEM részei)
    const result = damageReportSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Érvénytelen adatok",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = result.data

    // Technikusi (munkalap) token — egyedi e-mailes link, 30 napos lejárat
    const technicianToken = randomUUID()
    const technicianTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // 4. Prisma: rekord mentése (PENDING_TECHNICIAN állapotban, base64 aláírásokkal)
    let report
    try {
      report = await prisma.damageReport.create({
        data: {
          ownerName: data.ownerName,
          ownerAddress: data.ownerAddress,
          idOrTaxNumber: data.idOrTaxNumber,
          driverName: data.driverName ?? null,
          driverAddress: data.driverAddress ?? null,
          driverPhone: data.driverPhone ?? null,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          vehiclePlate: data.vehiclePlate,
          vehicleMake: data.vehicleMake,
          vehicleModel: data.vehicleModel,
          vehicleYear: data.vehicleYear ?? null,
          vehicleVin: data.vehicleVin,
          hasCasco: data.hasCasco,
          cascoInsurer: data.cascoInsurer ?? null,
          liabilityInsurer: data.liabilityInsurer ?? null,
          relevantInsurer: data.relevantInsurer ?? null,
          insuranceCompany: data.insuranceCompany,
          insuranceCompanyOther: data.insuranceCompanyOther ?? null,
          accidentDate: data.accidentDate ? new Date(data.accidentDate) : null,
          accidentCountry: data.accidentCountry ?? null,
          accidentCity: data.accidentCity ?? null,
          accidentStreet: data.accidentStreet ?? null,
          outsideSettlement: data.outsideSettlement,
          roadNumber: data.roadNumber ?? null,
          kilometerMark: data.kilometerMark ?? null,
          policeInvolved: data.policeInvolved,
          policeStation: data.policeStation ?? null,
          otherVehiclePlate: data.otherVehiclePlate ?? null,
          otherVehicleType: data.otherVehicleType ?? null,
          otherVehicleColor: data.otherVehicleColor ?? null,
          additionalParties: data.additionalParties ?? null,
          vehicleInspectionLocation: data.vehicleInspectionLocation ?? null,
          damageDescription: data.damageDescription ?? null,
          damagePoints: data.damagePoints ?? [],
          photoUrls: data.photoUrls ?? [],
          liableParty: data.liableParty ?? null,
          underInfluence: data.underInfluence,
          licenseValid: data.licenseValid,
          vatReclaimEligible: data.vatReclaimEligible,
          taxNumber: data.taxNumber ?? null,
          consentToPhotocopy: data.consentToPhotocopy,
          cascoClaimRequest: data.cascoClaimRequest,
          vehicleEncumbrance: data.vehicleEncumbrance,
          encumbranceFinancier: data.encumbranceFinancier ?? null,
          accept8DayPayment: data.accept8DayPayment,
          knowsCascoTerms: data.knowsCascoTerms,
          ownerSignatureUrl: null, // Feltöltés után frissül
          driverSignatureUrl: null, // Feltöltés után frissül
          gdprConsent: data.gdprConsent,
          status: "PENDING_TECHNICIAN",
          technicianToken,
          technicianTokenExpiresAt,
        },
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Adatbázis hiba. Kérjük próbálja újra később." },
        { status: 500 }
      )
    }

    // 5. Aláírások feltöltése Supabase Storage-ba
    try {
      const ownerSigUrl = data.ownerSignatureUrl
        ? await uploadSignature(data.ownerSignatureUrl, data.vehiclePlate, report.id, "owner")
        : null

      const driverSigUrl = data.driverSignatureUrl
        ? await uploadSignature(data.driverSignatureUrl, data.vehiclePlate, report.id, "driver")
        : null

      await prisma.damageReport.update({
        where: { id: report.id },
        data: {
          ownerSignatureUrl: ownerSigUrl,
          driverSignatureUrl: driverSigUrl,
        },
      })
    } catch (uploadError) {
      console.error("Aláírás feltöltési hiba:", uploadError)
      return NextResponse.json(
        { error: "Aláírás feltöltési hiba. Kérjük próbálja újra később." },
        { status: 500 }
      )
    }

    // 6. Technikusi értesítő email — a munkalap linkkel (NEM a végleges, összevont PDF — az
    // a technikus lezárása után készül el, lásd app/api/munkalap/[id]/route.ts)
    try {
      const munkalapUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/munkalap/session?id=${report.id}&token=${technicianToken}`
      await sendTechnicianNotification({
        vehiclePlate: data.vehiclePlate,
        ownerName: data.ownerName,
        createdAt: report.createdAt,
        munkalapUrl,
      })
    } catch (emailError) {
      // Email hiba esetén NEM rollback-eljük a DB rekordot — csak logoljuk
      console.error("Technikusi értesítő email hiba:", emailError)
    }

    // 7. Ügyfél visszaigazoló email — még a jegyzőkönyv lezárása előtt, PDF nélkül
    // (a végleges, összevont PDF a technikus lezárása után megy ki, lásd lib/finalize.ts)
    try {
      await sendCustomerSubmissionEmail({
        ownerName: data.ownerName,
        vehiclePlate: data.vehiclePlate,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        id: report.id,
        createdAt: report.createdAt,
        photoUrls: data.photoUrls,
      })
    } catch (emailError) {
      console.error("Ügyfél visszaigazoló email hiba:", emailError)
    }

    // 8. Sikeres válasz
    return NextResponse.json(
      {
        success: true,
        id: report.id,
        message: "Kárfelvétel sikeresen beküldve",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Váratlan hiba történt. Kérjük próbálja újra később." },
      { status: 500 }
    )
  }
}
