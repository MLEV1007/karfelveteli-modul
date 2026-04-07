import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { randomUUID } from "crypto"
import { damageReportSchema } from "@/lib/validation"
import { prisma } from "@/lib/db"
import { generatePDF } from "@/lib/pdf"
import { sendReportEmails } from "@/lib/email"
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

    // 3. Zod validáció
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

    // Token generálás szerkesztéshez (7 napos lejárat)
    const editToken = randomUUID()
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 nap

    // 4. Prisma: rekord mentése (először base64 adatokkal)
    let report
    try {
      report = await prisma.damageReport.create({
        data: {
          ownerName: data.ownerName,
          ownerAddress: data.ownerAddress ?? null,
          driverName: data.driverName ?? null,
          driverAddress: data.driverAddress ?? null,
          driverPhone: data.driverPhone ?? null,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone ?? null,
          vehiclePlate: data.vehiclePlate,
          vehicleMake: data.vehicleMake,
          vehicleModel: data.vehicleModel,
          vehicleYear: data.vehicleYear ?? null,
          vehicleVin: data.vehicleVin ?? null,
          hasCasco: data.hasCasco,
          cascoInsurer: data.cascoInsurer ?? null,
          liabilityInsurer: data.liabilityInsurer ?? null,
          relevantInsurer: data.relevantInsurer ?? null,
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
          ownerSignatureUrl: null, // Will be updated after R2 upload
          driverSignatureUrl: null, // Will be updated after R2 upload
          gdprConsent: data.gdprConsent,
          editToken,
          tokenExpiresAt,
        },
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Adatbázis hiba. Kérjük próbálja újra később." },
        { status: 500 }
      )
    }

    // 4.5 Aláírások feltöltése R2-re
    // Fotók már feltöltve a kliensen keresztül presigned URL-lel
    const ownerSignatureBase64 = data.ownerSignatureUrl
    const driverSignatureBase64 = data.driverSignatureUrl ?? ""

    try {
      // Upload owner signature
      const ownerSigUrl = data.ownerSignatureUrl
        ? await uploadSignature(
            data.ownerSignatureUrl,
            data.vehiclePlate,
            report.id,
            "owner"
          )
        : null

      // Upload driver signature (if provided)
      const driverSigUrl = data.driverSignatureUrl
        ? await uploadSignature(
            data.driverSignatureUrl,
            data.vehiclePlate,
            report.id,
            "driver"
          )
        : null

      // Update database with signature URLs
      await prisma.damageReport.update({
        where: { id: report.id },
        data: {
          ownerSignatureUrl: ownerSigUrl,
          driverSignatureUrl: driverSigUrl,
        },
      })

      data.ownerSignatureUrl = ownerSigUrl ?? ""
      data.driverSignatureUrl = driverSigUrl ?? ""
    } catch (uploadError) {
      console.error("R2 upload error:", uploadError)
      return NextResponse.json(
        { error: "Aláírás feltöltési hiba. Kérjük próbálja újra később." },
        { status: 500 }
      )
    }

    // 5. PDF generálás
    // Aláírásokhoz base64 adatot használunk (react-pdf nem kell hálózati kérést küldjön)
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generatePDF({
        ...data,
        ownerSignatureUrl: ownerSignatureBase64,
        driverSignatureUrl: driverSignatureBase64 || undefined,
        id: report.id,
        createdAt: report.createdAt,
      })
    } catch (pdfError) {
      console.error("PDF hiba részletei:", pdfError)
      console.error("PDF hiba stack:", (pdfError as Error)?.stack)
      return NextResponse.json(
        { error: "PDF generálási hiba. Kérjük próbálja újra később." },
        { status: 500 }
      )
    }

    // 6. Email küldés
    try {
      await sendReportEmails(
        {
          ...data,
          id: report.id,
          createdAt: report.createdAt,
          editToken: report.editToken ?? undefined,
        },
        pdfBuffer
      )
    } catch (emailError) {
      // Email hiba esetén NEM rollback-eljük a DB rekordot
      // A rekord megmarad, csak logoljuk a hibát
      console.error("Email sending error:", emailError)
      // Nem dobunk 500-at, mert a beküldés egyébként sikeres volt
    }

    // 7. DB frissítés: emailSentAt
    try {
      await prisma.damageReport.update({
        where: { id: report.id },
        data: { emailSentAt: new Date() },
      })
    } catch (updateError) {
      // Ha az update sikertelen, nem gond, a fő rekord létrejött
      console.error("Email timestamp update error:", updateError)
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
