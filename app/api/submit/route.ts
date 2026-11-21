import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { Prisma } from "@prisma/client"
import { damageReportSchema } from "@/lib/validation"
import { enforceRateLimit } from "@/lib/ratelimit"
import { prisma } from "@/lib/db"
import { sendCustomerSubmissionEmail, sendTechnicianNotification } from "@/lib/email"
import { uploadSignature } from "@/lib/storage"
import { nextReferenceNumber } from "@/lib/referenceNumber"

// Ha egy korábbi, ugyanilyen clientRequestId-jú kérés létrehozta a rekordot, de az aláírás-feltöltés
// még nem fejeződött be, ennyi ideig feltételezzük, hogy az eredeti kérés még FUT (pl. a kliens
// időtúllépett, de a szerver dolgozik) — ilyenkor nem indítunk párhuzamos feldolgozást.
const IN_PROGRESS_WINDOW_MS = 90_000

type ReportRef = { id: string; ownerSignatureUrl: string | null; createdAt: Date }

function duplicateResponse(report: ReportRef): NextResponse {
  // Ugyanaz a rekord, új e-mail/PDF-kiküldés nélkül
  if (report.ownerSignatureUrl === null && Date.now() - report.createdAt.getTime() < IN_PROGRESS_WINDOW_MS) {
    return NextResponse.json(
      { error: "A beküldés feldolgozása még folyamatban van. Kérjük próbálja újra néhány másodperc múlva." },
      { status: 409 }
    )
  }
  return NextResponse.json(
    {
      success: true,
      id: report.id,
      duplicate: true,
      message: "Kárfelvétel sikeresen beküldve",
    },
    { status: 200 }
  )
}

function isClientRequestIdConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false
  const target = error.meta?.target
  return Array.isArray(target) ? target.includes("clientRequestId") : String(target ?? "").includes("clientRequestId")
}

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

    // Idempotencia: ugyanarra a clientRequestId-ra ugyanazt a rekordot adjuk vissza. A
    // ellenőrzés a létrehozás ELŐTT van, hogy ne égessünk el felesleges BIZT-sorszámot.
    // (Aláírás-feltöltésen elbukott, elhagyott rekordnál lásd lent: a feltöltés folytatódik.)
    let resumeReport: ReportRef | null = null
    if (data.clientRequestId) {
      const existing = await prisma.damageReport.findUnique({
        where: { clientRequestId: data.clientRequestId },
        select: { id: true, ownerSignatureUrl: true, createdAt: true },
      })
      if (existing) {
        if (existing.ownerSignatureUrl !== null) return duplicateResponse(existing)
        const response = duplicateResponse(existing)
        if (response.status === 409) return response
        resumeReport = existing // régi, félbemaradt beküldés: a feltöltést és az értesítést pótoljuk
      }
    }

    // Technikusi (munkalap) token — egyedi e-mailes link, 30 napos lejárat
    let technicianToken: string = randomUUID()
    const technicianTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // 4. Prisma: rekord mentése (PENDING_TECHNICIAN állapotban, base64 aláírásokkal)
    let report: { id: string; referenceNumber: string; createdAt: Date }
    // (technicianToken a resume-ágban a rekordból jön)
    if (resumeReport) {
      const found = await prisma.damageReport.findUnique({
        where: { id: resumeReport.id },
        select: { id: true, referenceNumber: true, createdAt: true, technicianToken: true },
      })
      if (!found) {
        return NextResponse.json(
          { error: "Adatbázis hiba. Kérjük próbálja újra később." },
          { status: 500 }
        )
      }
      report = found
      // A munkalap-linkben a rekordban már tárolt tokent kell használni, nem az újonnan generáltat
      if (found.technicianToken) technicianToken = found.technicianToken
    } else {
      try {
        // Ügyfél felé megjelenő azonosító — sorban növekvő "BIZTxxxx" formátum (nem a belső cuid)
        const referenceNumber = await nextReferenceNumber()
        report = await prisma.damageReport.create({
          data: {
            referenceNumber,
            clientRequestId: data.clientRequestId ?? null,
            ownerType: data.ownerType ?? null,
            ownerName: data.ownerName,
            ownerAddress: data.ownerAddress,
            idOrTaxNumber: data.idOrTaxNumber,
            driverSameAsOwner: data.driverSameAsOwner ?? false,
            driverName: data.driverName ?? null,
            driverAddress: data.driverAddress ?? null,
            driverPhone: data.driverPhone ?? null,
            driverBirthDate: data.driverBirthDate ? new Date(data.driverBirthDate) : null,
            driverLicenseNumber: data.driverLicenseNumber ?? null,
            driverLicenseValidUntil: data.driverLicenseValidUntil ? new Date(data.driverLicenseValidUntil) : null,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            vehiclePlate: data.vehiclePlate,
            vehicleMake: data.vehicleMake,
            vehicleModel: data.vehicleModel,
            vehicleYear: data.vehicleYear ?? null,
            vehicleVin: data.vehicleVin,
            vehicleRegistrationDate: data.vehicleRegistrationDate ? new Date(data.vehicleRegistrationDate) : null,
            vehicleInspectionValidUntil: data.vehicleInspectionValidUntil
              ? new Date(data.vehicleInspectionValidUntil)
              : null,
            vehicleEngineCapacity: data.vehicleEngineCapacity ?? null,
            vehiclePowerKw: data.vehiclePowerKw ?? null,
            vehicleColor: data.vehicleColor ?? null,
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
            damageType: data.damageType ?? null,
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
        // Versenyhelyzet: két párhuzamos kérés ugyanazzal a kulccsal — a vesztes a nyertes rekordját kapja
        if (data.clientRequestId && isClientRequestIdConflict(dbError)) {
          const winner = await prisma.damageReport.findUnique({
            where: { clientRequestId: data.clientRequestId },
            select: { id: true, ownerSignatureUrl: true, createdAt: true },
          })
          if (winner) {
            // A nyertes még feltöltés alatt lehet: ilyenkor a duplicateResponse 409-et ad, a
            // kliens újrapróbálhatja; kész rekordnál 200 + ugyanaz az id.
            return duplicateResponse(winner)
          }
        }
        console.error("Database error:", dbError)
        return NextResponse.json(
          { error: "Adatbázis hiba. Kérjük próbálja újra később." },
          { status: 500 }
        )
      }
    }

    // 5. Aláírások feltöltése Supabase Storage-ba
    try {
      const ownerSigUrl = data.ownerSignatureUrl
        ? await uploadSignature(data.ownerSignatureUrl, data.vehiclePlate, report.id, "owner")
        : null

      // Azonos vezető és tulajdonos esetén csak egy aláírás van (a tulajdonosé) — a PDF
      // ugyanazt teszi mindkét dobozba, külön vezetői aláírást nem tárolunk.
      const driverSigUrl = data.driverSignatureUrl && !data.driverSameAsOwner
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
      // Az éppen most létrehozott, aláírás nélkül maradt rekordot eltávolítjuk, hogy az
      // újrapróbálás (ugyanazzal a clientRequestId-val) tiszta lappal indulhasson, és ne
      // maradjon árva sor. Folytatott (resume) rekordhoz nem nyúlunk.
      if (!resumeReport) {
        try {
          await prisma.damageReport.delete({ where: { id: report.id } })
        } catch (cleanupError) {
          console.error("Árva rekord törlése sikertelen:", cleanupError)
        }
      }
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
        customerEmail: data.customerEmail,
        ownerName: data.ownerName,
        vehiclePlate: data.vehiclePlate,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        referenceNumber: report.referenceNumber,
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
