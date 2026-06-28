import type { DamageReport } from "@prisma/client"
import { prisma } from "./db"
import { generateFullReportPDF, type FullPdfData } from "./pdf"
import { sendFinalReportEmails } from "./email"
import { uploadFinalPdf, downloadSignatureAsBase64 } from "./storage"
import { getDefaultEquipmentChecklist } from "./equipment"

// A tárolt Prisma rekordot a PDF-generátor által várt alakra hozza.
// A signature mezőket a hívó már base64-re konvertálva adja át (réteg-szétválasztás:
// ez a függvény tisztán adatleképzés, az I/O — Storage letöltés — a finalizeReport-ban történik).
function toFullPdfData(
  report: DamageReport,
  signatures: { owner: string; driver?: string; technician: string }
): FullPdfData {
  return {
    id: report.id,
    createdAt: report.createdAt,
    ownerName: report.ownerName,
    ownerAddress: report.ownerAddress ?? "",
    idOrTaxNumber: report.idOrTaxNumber ?? "",
    driverName: report.driverName ?? undefined,
    driverAddress: report.driverAddress ?? undefined,
    driverPhone: report.driverPhone ?? undefined,
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
    accidentDate: report.accidentDate ? report.accidentDate.toISOString() : undefined,
    accidentCountry: report.accidentCountry ?? undefined,
    accidentCity: report.accidentCity ?? undefined,
    accidentStreet: report.accidentStreet ?? undefined,
    outsideSettlement: report.outsideSettlement,
    roadNumber: report.roadNumber ?? undefined,
    kilometerMark: report.kilometerMark ?? undefined,
    policeInvolved: report.policeInvolved,
    policeReportNo: report.policeReportNo ?? undefined,
    policeStation: report.policeStation ?? undefined,
    otherVehiclePlate: report.otherVehiclePlate ?? undefined,
    otherVehicleType: report.otherVehicleType ?? undefined,
    otherVehicleColor: report.otherVehicleColor ?? undefined,
    additionalParties: report.additionalParties ?? undefined,
    vehicleInspectionLocation: report.vehicleInspectionLocation ?? undefined,
    damageDescription: report.damageDescription ?? "",
    damagePoints: (report.damagePoints as FullPdfData["damagePoints"]) ?? undefined,
    photoUrls: report.photoUrls ?? undefined,
    liableParty: (report.liableParty ?? "own") as FullPdfData["liableParty"],
    underInfluence: report.underInfluence,
    licenseValid: report.licenseValid,
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
    equipmentChecklist: (report.equipmentChecklist ?? getDefaultEquipmentChecklist()) as FullPdfData["equipmentChecklist"],
    damageNotes: report.damageNotes ?? "",
    technicianName: report.technicianName ?? "",
    technicianSignatureUrl: signatures.technician,
  }
}

export type FinalizeResult = { ok: true } | { ok: false; error: string }

// A technikus lezárása (vagy egy újrapróbálkozás) után lefutó teljes pipeline:
// aláírások base64-esítése -> végleges PDF -> Storage feltöltés -> email kiküldés -> állapot frissítés.
// Idempotens: ha a rekord már COMPLETED, nem csinál semmit (nem küldi ki duplán az emaileket).
export async function finalizeReport(reportId: string): Promise<FinalizeResult> {
  const report = await prisma.damageReport.findUnique({ where: { id: reportId } })
  if (!report) return { ok: false, error: "A jelentés nem található" }

  if (report.status === "COMPLETED") {
    return { ok: true }
  }

  try {
    const ownerSigBase64 = report.ownerSignatureUrl
      ? await downloadSignatureAsBase64(report.ownerSignatureUrl)
      : ""
    const driverSigBase64 = report.driverSignatureUrl
      ? await downloadSignatureAsBase64(report.driverSignatureUrl)
      : undefined
    const technicianSigBase64 = report.technicianSignatureUrl
      ? await downloadSignatureAsBase64(report.technicianSignatureUrl)
      : ""

    const pdfData = toFullPdfData(report, {
      owner: ownerSigBase64,
      driver: driverSigBase64,
      technician: technicianSigBase64,
    })

    const pdfBuffer = await generateFullReportPDF(pdfData)
    const finalPdfUrl = await uploadFinalPdf(pdfBuffer, report.vehiclePlate, report.id)

    await sendFinalReportEmails(
      { ...pdfData, editToken: report.editToken ?? undefined },
      pdfBuffer
    )

    await prisma.damageReport.update({
      where: { id: report.id },
      data: {
        status: "COMPLETED",
        finalPdfUrl,
        munkalapClosedAt: new Date(),
        pdfErrorMessage: null,
      },
    })

    return { ok: true }
  } catch (error) {
    console.error("Véglegesítési pipeline hiba:", error)
    const message = error instanceof Error ? error.message : "Ismeretlen hiba a véglegesítés során"
    await prisma.damageReport.update({
      where: { id: report.id },
      data: { status: "FAILED_PDF", pdfErrorMessage: message },
    })
    return { ok: false, error: message }
  }
}
