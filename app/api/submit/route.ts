import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { randomUUID } from "crypto"
import { damageReportSchema } from "@/lib/validation"
import { prisma } from "@/lib/db"
import { sendTechnicianNotification } from "@/lib/email"
import { uploadSignature } from "@/lib/storage"

// Rate limiter: max 10 beküldés / IP / óra
// Ha nincs Redis konfig, kihagyjuk a rate limiting-et (dev mode)
let ratelimit: Ratelimit | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
    })
  }
} catch (error) {
  console.warn("Rate limiting disabled - Redis configuration missing or invalid")
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (ha elérhető)
    if (ratelimit) {
      const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1"
      const { success: rateLimitOk } = await ratelimit.limit(ip)

      if (!rateLimitOk) {
        return NextResponse.json(
          { error: "Túl sok kérés. Kérjük várjon egy órát." },
          { status: 429 }
        )
      }
    }

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

    // Szerkesztési token (ügyfélnek, 7 napos lejárat)
    const editToken = randomUUID()
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

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
          policeReportNo: data.policeReportNo ?? null,
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
          editToken,
          tokenExpiresAt,
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
      const munkalapUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/munkalap/${report.id}?token=${technicianToken}`
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

    // 7. Sikeres válasz
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
