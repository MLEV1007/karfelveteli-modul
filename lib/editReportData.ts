// A szerkesztés közös logikája: melyik Zod-séma érvényes, és a validált adatból a Prisma
// frissítési adat. Közös az ügyfél-oldali tokenes /api/edit és az admin PATCH között,
// hogy a két út mezőlistája ne csússzon szét.
import type { Prisma } from "@prisma/client"
import { editReportSchema, editReportLegacyWindshieldSchema, type EditReportInput } from "./validation"
import { isWindshieldDamage, normalizeWindshieldCause } from "./damageTypes"

/**
 * Régi (szélvédő-ok nélkül beküldött) szélvédős rekord: ha a kérés sem küld okot, az ok
 * nem kötelező és null marad — így a korábbi rekordok változatlanul szerkeszthetők.
 */
export function pickEditSchema(
  report: { damageType: string | null; windshieldCause: string | null },
  data: { windshieldCause?: unknown }
) {
  const isLegacyWindshield =
    isWindshieldDamage(report.damageType) && !report.windshieldCause && !data.windshieldCause
  return isLegacyWindshield ? editReportLegacyWindshieldSchema : editReportSchema
}

/** Csak a validált, szerkeszthető mezők; fotók, aláírások, GDPR, createdAt, emailSentAt SZÁNDÉKOSAN nincsenek. */
export function buildEditUpdateData(v: EditReportInput): Prisma.DamageReportUncheckedUpdateManyInput {
  return {
    // Step 1
    ownerType: v.ownerType,
    ownerName: v.ownerName,
    ownerAddress: v.ownerAddress ?? null,
    idOrTaxNumber: v.idOrTaxNumber ?? null,
    driverSameAsOwner: v.driverSameAsOwner,
    driverName: v.driverName ?? null,
    driverAddress: v.driverAddress ?? null,
    driverPhone: v.driverPhone ?? null,
    driverBirthDate: v.driverBirthDate ? new Date(v.driverBirthDate) : null,
    driverLicenseNumber: v.driverLicenseNumber ?? null,
    driverLicenseValidUntil: v.driverLicenseValidUntil ? new Date(v.driverLicenseValidUntil) : null,
    customerEmail: v.customerEmail,
    customerPhone: v.customerPhone ?? null,

    // Step 2
    vehiclePlate: v.vehiclePlate,
    vehicleMake: v.vehicleMake,
    vehicleModel: v.vehicleModel,
    vehicleYear: v.vehicleYear ?? null,
    vehicleVin: v.vehicleVin ?? null,
    hasCasco: v.hasCasco,
    cascoInsurer: v.cascoInsurer ?? null,
    liabilityInsurer: v.liabilityInsurer ?? null,
    relevantInsurer: v.relevantInsurer ?? null,
    insuranceCompany: v.insuranceCompany ?? null,
    insuranceCompanyOther: v.insuranceCompanyOther ?? null,

    // Step 3
    accidentDate: v.accidentDate ? new Date(v.accidentDate) : null,
    accidentCountry: v.accidentCountry ?? null,
    accidentCity: v.accidentCity ?? null,
    accidentStreet: v.accidentStreet ?? null,
    outsideSettlement: v.outsideSettlement,
    roadNumber: v.roadNumber ?? null,
    kilometerMark: v.kilometerMark ?? null,
    policeInvolved: v.policeInvolved,
    policeStation: v.policeStation ?? null,
    otherVehiclePlate: v.otherVehiclePlate ?? null,
    otherVehicleType: v.otherVehicleType ?? null,
    otherVehicleColor: v.otherVehicleColor ?? null,
    additionalParties: v.additionalParties ?? null,
    vehicleInspectionLocation: v.vehicleInspectionLocation ?? null,

    // Step 4
    damageType: v.damageType,
    ...normalizeWindshieldCause(v),
    damageDescription: v.damageDescription ?? null,
    damagePoints: v.damagePoints ?? [],

    // Step 5
    liableParty: v.liableParty ?? null,
    underInfluence: v.underInfluence,
    licenseValid: v.licenseValid,
    vatReclaimEligible: v.vatReclaimEligible,
    taxNumber: v.taxNumber ?? null,
    consentToPhotocopy: v.consentToPhotocopy,
    cascoClaimRequest: v.cascoClaimRequest,
    vehicleEncumbrance: v.vehicleEncumbrance,

    // Jegyzőkönyv kizárólagos választásai — csak ha a technikus megadta őket
    // (undefined esetén a Prisma nem írja felül a meglévő értéket)
    vehicleCategory: v.vehicleCategory,
    workProcess: v.workProcess,
    vehicleCondition: v.vehicleCondition,
    selectedAuthorizations: v.selectedAuthorizations,
  }
}
