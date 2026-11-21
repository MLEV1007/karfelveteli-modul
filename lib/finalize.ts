import type { DamageReport, Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import { prisma } from "./db"
import { generateMainReportPDF, generateAuthorizationPdfs, type FullPdfData } from "./pdf"
import { sendFinalReportEmails } from "./email"
import { uploadFinalPdf, uploadAuthorizationPdfs, downloadSignatureAsBase64 } from "./storage"
import { getDefaultEquipmentChecklist } from "./equipment"
import {
  WitnessError,
  requireTwoActiveWitnesses,
  toSnapshot,
  loadWitnessSignatureDataUrl,
  type WitnessSnapshotEntry,
} from "./witnesses"
import type { PdfWitness } from "./pdf/types"

// A mentett witnessSnapshot JSON ellenőrzése: pontosan 2, teljes bejegyzés kell
function parseWitnessSnapshot(value: unknown): WitnessSnapshotEntry[] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const entries: WitnessSnapshotEntry[] = []
  for (const v of value) {
    if (!v || typeof v !== "object") return null
    const { id, name, address, signatureKey } = v as Record<string, unknown>
    if (typeof id !== "string" || typeof name !== "string" || typeof address !== "string" || typeof signatureKey !== "string") {
      return null
    }
    entries.push({ id, name, address, signatureKey })
  }
  return entries
}

// A meghatalmazások tanúi: ha a rekordnak már van witnessSnapshot-ja (újragenerálás), AZT használjuk —
// akkor is, ha a tanúlistát azóta módosították. Különben (első lezárás) a pontosan 2 aktív tanú
// kell; ha nincs, WitnessError -> a rekord FAILED_PDF marad, a lezárás újrapróbálható.
async function resolveWitnesses(
  report: DamageReport
): Promise<{ snapshot: WitnessSnapshotEntry[]; pdfWitnesses: PdfWitness[]; isNew: boolean }> {
  let snapshot = parseWitnessSnapshot(report.witnessSnapshot)
  const isNew = !snapshot
  if (!snapshot) {
    try {
      snapshot = toSnapshot(await requireTwoActiveWitnesses())
    } catch (error) {
      if (error instanceof WitnessError) {
        throw new WitnessError(
          `Nincs 2 aktív tanú: ${error.message}. Állítsa be a tanúkat az admin felületen, majd próbálja újra a lezárást.`
        )
      }
      throw error
    }
  }
  const pdfWitnesses: PdfWitness[] = []
  for (const w of snapshot) {
    pdfWitnesses.push({
      name: w.name,
      address: w.address,
      signatureDataUrl: await loadWitnessSignatureDataUrl(w.signatureKey),
    })
  }
  return { snapshot, pdfWitnesses, isNew }
}

// A tárolt Prisma rekordot a PDF-generátor által várt alakra hozza.
// A signature mezőket a hívó már base64-re konvertálva adja át (réteg-szétválasztás:
// ez a függvény tisztán adatleképzés, az I/O — Storage letöltés — a finalizeReport-ban történik).
function toFullPdfData(
  report: DamageReport,
  signatures: { owner: string; driver?: string; technician: string },
  munkalapClosedAt: Date,
  witnesses?: PdfWitness[]
): FullPdfData {
  return {
    id: report.id,
    referenceNumber: report.referenceNumber,
    createdAt: report.createdAt,
    munkalapClosedAt,
    ownerType: report.ownerType ?? undefined,
    ownerName: report.ownerName,
    ownerAddress: report.ownerAddress ?? "",
    idOrTaxNumber: report.idOrTaxNumber ?? "",
    driverSameAsOwner: report.driverSameAsOwner,
    driverName: report.driverName ?? undefined,
    driverAddress: report.driverAddress ?? undefined,
    driverPhone: report.driverPhone ?? undefined,
    driverBirthDate: report.driverBirthDate ? report.driverBirthDate.toISOString() : undefined,
    driverLicenseNumber: report.driverLicenseNumber ?? undefined,
    driverLicenseValidUntil: report.driverLicenseValidUntil
      ? report.driverLicenseValidUntil.toISOString()
      : undefined,
    customerEmail: report.customerEmail,
    customerPhone: report.customerPhone ?? "",
    vehiclePlate: report.vehiclePlate,
    vehicleMake: report.vehicleMake,
    vehicleModel: report.vehicleModel,
    vehicleYear: report.vehicleYear ?? undefined,
    vehicleVin: report.vehicleVin ?? "",
    hasCasco: report.hasCasco,
    cascoInsurer: report.cascoInsurer ?? undefined,
    liabilityInsurer: report.liabilityInsurer ?? undefined,
    relevantInsurer: report.relevantInsurer ?? undefined,
    insuranceCompany: (report.insuranceCompany ?? "EGYEB") as FullPdfData["insuranceCompany"],
    insuranceCompanyOther: report.insuranceCompanyOther ?? undefined,
    vehicleRegistrationDate: report.vehicleRegistrationDate
      ? report.vehicleRegistrationDate.toISOString()
      : undefined,
    vehicleInspectionValidUntil: report.vehicleInspectionValidUntil
      ? report.vehicleInspectionValidUntil.toISOString()
      : undefined,
    vehicleEngineCapacity: report.vehicleEngineCapacity ?? undefined,
    vehiclePowerKw: report.vehiclePowerKw ?? undefined,
    vehicleColor: report.vehicleColor ?? undefined,
    accidentDate: report.accidentDate ? report.accidentDate.toISOString() : undefined,
    accidentCountry: report.accidentCountry ?? undefined,
    accidentCity: report.accidentCity ?? undefined,
    accidentStreet: report.accidentStreet ?? undefined,
    outsideSettlement: report.outsideSettlement,
    roadNumber: report.roadNumber ?? undefined,
    kilometerMark: report.kilometerMark ?? undefined,
    policeInvolved: report.policeInvolved,
    policeStation: report.policeStation ?? undefined,
    otherVehiclePlate: report.otherVehiclePlate ?? undefined,
    otherVehicleType: report.otherVehicleType ?? undefined,
    otherVehicleColor: report.otherVehicleColor ?? undefined,
    additionalParties: report.additionalParties ?? undefined,
    vehicleInspectionLocation: report.vehicleInspectionLocation ?? undefined,
    damageType: report.damageType ?? undefined,
    damageDescription: report.damageDescription ?? "",
    damagePoints: (report.damagePoints as FullPdfData["damagePoints"]) ?? undefined,
    photoUrls: report.photoUrls ?? undefined,
    liableParty: (report.liableParty ?? "own") as FullPdfData["liableParty"],
    underInfluence: report.underInfluence,
    licenseValid: report.licenseValid,
    vatReclaimEligible: report.vatReclaimEligible,
    taxNumber: report.taxNumber ?? undefined,
    consentToPhotocopy: report.consentToPhotocopy,
    cascoClaimRequest: report.cascoClaimRequest,
    vehicleEncumbrance: report.vehicleEncumbrance,
    encumbranceFinancier: report.encumbranceFinancier ?? undefined,
    accept8DayPayment: true,
    knowsCascoTerms: true,
    ownerSignatureUrl: signatures.owner,
    driverSignatureUrl: signatures.driver,
    gdprConsent: true,
    vehicleCheckIn: report.vehicleCheckIn ? report.vehicleCheckIn.toISOString() : "",
    vehicleCheckOut: report.vehicleCheckOut ? report.vehicleCheckOut.toISOString() : "",
    vehicleCategory: (report.vehicleCategory ?? undefined) as FullPdfData["vehicleCategory"],
    workProcess: (report.workProcess ?? undefined) as FullPdfData["workProcess"],
    vehicleCondition: (report.vehicleCondition ?? undefined) as FullPdfData["vehicleCondition"],
    // Üres tömb = régi kárügy -> mindhárom meghatalmazás elkészül (lásd resolveSelectedAuthorizations)
    selectedAuthorizations: (report.selectedAuthorizations ?? []) as FullPdfData["selectedAuthorizations"],
    equipmentChecklist: (report.equipmentChecklist ?? getDefaultEquipmentChecklist()) as FullPdfData["equipmentChecklist"],
    damageNotes: report.damageNotes ?? "",
    technicianName: report.technicianName ?? "",
    technicianSignatureUrl: signatures.technician,
    witnesses,
  }
}

export type FinalizeResult = { ok: true } | { ok: false; error: string }

const EDIT_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 nap

interface FinalizeOptions {
  // Egy már COMPLETED rekordot is újra végigfuttat a pipeline-on (új PDF + email) —
  // a műhelyi szerkesztés utáni dokumentum-frissítéshez használja az /api/edit route.
  force?: boolean
  // Mely végleges e-maileket küldje ki (alapértelmezés: mindkettőt — a technikusi lezárás útja).
  // Az admin „újragenerálás” alapból NEM küld e-mailt, csak a kijelölt címzetteknek.
  emails?: { customer: boolean; workshop: boolean }
}

// A technikus lezárása (vagy egy újrapróbálkozás, vagy egy utólagos szerkesztés) után lefutó
// teljes pipeline: aláírások base64-esítése -> végleges PDF -> Storage feltöltés -> email
// kiküldés -> állapot frissítés.
// Idempotens: ha a rekord már COMPLETED és nincs force, nem csinál semmit (nem küldi ki duplán az emaileket).
export async function finalizeReport(
  reportId: string,
  options?: FinalizeOptions
): Promise<FinalizeResult> {
  const report = await prisma.damageReport.findUnique({ where: { id: reportId } })
  if (!report) return { ok: false, error: "A jelentés nem található" }

  if (report.status === "COMPLETED" && !options?.force) {
    return { ok: true }
  }

  try {
    // Szerkesztési token (csak a műhelynek) — a jegyzőkönyv lezárásakor jön létre,
    // 14 napig érvényes a lezárástól (nem a beküldéstől) számítva. Egy utólagos
    // szerkesztés/újraküldés a már meglévő tokent használja, nem generál újat.
    let editToken = report.editToken
    if (!editToken) {
      editToken = randomUUID()
      const tokenExpiresAt = new Date(Date.now() + EDIT_TOKEN_TTL_MS)
      await prisma.damageReport.update({
        where: { id: report.id },
        data: { editToken, tokenExpiresAt },
      })
    }

    // A két tanú (snapshot vagy az aktuális 2 aktív tanú) — hiba esetén a pipeline FAILED_PDF-re áll
    const witnesses = await resolveWitnesses(report)

    const ownerSigBase64 = report.ownerSignatureUrl
      ? await downloadSignatureAsBase64(report.ownerSignatureUrl)
      : ""
    const driverSigBase64 = report.driverSignatureUrl
      ? await downloadSignatureAsBase64(report.driverSignatureUrl)
      : undefined
    const technicianSigBase64 = report.technicianSignatureUrl
      ? await downloadSignatureAsBase64(report.technicianSignatureUrl)
      : ""

    // Az első lezárás időpontja — egy utólagos szerkesztés/újraküldés nem írja felül.
    // Már a PDF-generálás előtt rögzítjük, hogy a Jegyzőkönyv "Lezárva:" dátuma és az
    // adatbázisba mentett munkalapClosedAt pontosan ugyanaz legyen.
    const munkalapClosedAt = report.munkalapClosedAt ?? new Date()

    const pdfData = toFullPdfData(
      report,
      {
        owner: ownerSigBase64,
        driver: driverSigBase64,
        technician: technicianSigBase64,
      },
      munkalapClosedAt,
      witnesses.pdfWitnesses
    )

    // A fő, összevont PDF (Kárbejelentő + Iratösszesítő + Jegyzőkönyv) és a technikus által
    // kiválasztott meghatalmazások (mindegyik külön PDF-ben) egy pipeline lépésként készülnek
    // el — vagy minden dokumentum sikeresen elkészül, feltöltésre és kiküldésre kerül, vagy a
    // rekord FAILED_PDF marad és egy Retry mindet újra megpróbálja.
    const pdfBuffer = await generateMainReportPDF(pdfData)
    const authorizationPdfs = await generateAuthorizationPdfs(pdfData)

    const finalPdfUrl = await uploadFinalPdf(pdfBuffer, report.vehiclePlate, report.id)
    const authorizationPdfUrls = await uploadAuthorizationPdfs(authorizationPdfs, report.vehiclePlate, report.id)

    await sendFinalReportEmails({ ...pdfData, editToken }, pdfBuffer, authorizationPdfs, options?.emails)

    await prisma.damageReport.update({
      where: { id: report.id },
      data: {
        status: "COMPLETED",
        finalPdfUrl,
        authorizationPdfUrls,
        munkalapClosedAt,
        // Első sikeres lezáráskor rögzítjük a tanúkat; újragenerálásnál a meglévő marad
        ...(witnesses.isNew ? { witnessSnapshot: witnesses.snapshot as unknown as Prisma.InputJsonValue } : {}),
        pdfErrorMessage: null,
      },
    })

    return { ok: true }
  } catch (error) {
    console.error("Véglegesítési pipeline hiba:", error)
    const message = error instanceof Error ? error.message : "Ismeretlen hiba a véglegesítés során"
    await prisma.damageReport.update({
      where: { id: report.id },
      // Egy már lezárt jelentés szerkesztés utáni újraküldési hibája nem fokozza le
      // a státuszt — a korábban kiküldött PDF/email továbbra is érvényes marad.
      data:
        report.status === "COMPLETED"
          ? { pdfErrorMessage: message }
          : { status: "FAILED_PDF", pdfErrorMessage: message },
    })
    return { ok: false, error: message }
  }
}
