import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { editReportSchema } from "@/lib/validation"
import { validateEditToken } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Rate limiter: max 10 szerkesztés / IP / óra
// IP alapú (NEM token alapú), hogy lejárt tokennel se lehessen spammelni
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

export async function PATCH(req: NextRequest) {
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

    // Kinyerjük az id-t és tokent a body-ból
    const { id, token, ...data } = body

    if (!id || !token) {
      return NextResponse.json(
        { error: "Hiányzó azonosító vagy token" },
        { status: 400 }
      )
    }

    // 3. Token validáció
    const report = await validateEditToken(id, token)
    if (!report) {
      // Egységes 401 — ne árulja el, hogy létezik-e vagy lejárt-e
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
        policeReportNo: validatedData.policeReportNo ?? null,
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
        taxNumber: validatedData.taxNumber ?? null,
        consentToPhotocopy: validatedData.consentToPhotocopy,
        cascoClaimRequest: validatedData.cascoClaimRequest,
        vehicleEncumbrance: validatedData.vehicleEncumbrance,

        // photoUrls, aláírások, gdprConsent, createdAt, emailSentAt
        // SZÁNDÉKOSAN NINCS FELSOROLVA — readonly mezők
      },
    })

    // 6. Sikeres válasz
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
