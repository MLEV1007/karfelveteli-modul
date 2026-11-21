// Admin részletező nézet: a DamageReport mezőinek olvasható, csoportosított megjelenítése.
// Tiszta függvény; token- és URL-jellegű mezőket NEM jelenít meg (a fájlok signed URL-lel külön jönnek).
import type { DamageReport } from "@prisma/client"
import { getInsuranceCompanyLabel, type InsuranceCompanyValue } from "./validation"
import { DAMAGE_TYPE_OPTIONS, WINDSHIELD_CAUSE_OPTIONS } from "./damageTypes"
import { OWNER_TYPE_OPTIONS } from "./ownerType"
import {
  VEHICLE_CATEGORY_OPTIONS,
  WORK_PROCESS_OPTIONS,
  VEHICLE_CONDITION_OPTIONS,
} from "./protocolChoices"
import { WORKSHOP_LEGAL_ENTITIES } from "./workshop"
import { EQUIPMENT_CHECKLIST_ITEMS, isEquipmentChecked, formatEquipmentDetail } from "./equipment"
import { STATUS_LABELS, type ReportStatusValue } from "./adminReportList"

export interface ViewRow {
  label: string
  value: string
}
export interface ViewSection {
  title: string
  rows: ViewRow[]
}

const DASH = "—"

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return DASH
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return DASH
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "UTC", // a csak-dátum mezők UTC éjfélként tárolódnak
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

const yesNo = (v: boolean | null | undefined) => (v ? "Igen" : "Nem")
const text = (v: string | number | null | undefined) =>
  v === null || v === undefined || String(v).trim() === "" ? DASH : String(v)

function optionLabel(options: readonly { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return DASH
  return options.find((o) => o.value === value)?.label ?? value
}

const LIABLE_LABELS: Record<string, string> = {
  own: "Saját felelősség",
  other: "A másik fél okozta",
  both: "Megosztott felelősség",
}

function equipmentSummary(value: unknown): string {
  if (!value || typeof value !== "object") return DASH
  const record = value as Record<string, never>
  const parts: string[] = []
  for (const def of EQUIPMENT_CHECKLIST_ITEMS) {
    const v = record[def.key]
    if (isEquipmentChecked(def, v)) parts.push(`${def.label}${formatEquipmentDetail(def, v)}`)
  }
  return parts.length ? parts.join(", ") : DASH
}

function witnessNames(snapshot: unknown): string {
  if (!Array.isArray(snapshot)) return DASH
  const names = snapshot
    .map((w) => (w && typeof w === "object" ? (w as { name?: unknown }).name : null))
    .filter((n): n is string => typeof n === "string")
  return names.length ? names.join(", ") : DASH
}

export function buildReportSections(r: DamageReport): ViewSection[] {
  const authorizations = (r.selectedAuthorizations?.length ? r.selectedAuthorizations : null)
  const authorizationLabels = authorizations
    ? WORKSHOP_LEGAL_ENTITIES.filter((e) => authorizations.includes(e.key)).map((e) => e.companyName).join(", ")
    : "Mindhárom (régi kitöltés)"
  const damagePointCount = Array.isArray(r.damagePoints) ? r.damagePoints.length : 0

  return [
    {
      title: "Állapot",
      rows: [
        { label: "Azonosító", value: r.referenceNumber },
        { label: "Állapot", value: STATUS_LABELS[r.status as ReportStatusValue] ?? r.status },
        { label: "Beküldve", value: formatDateTime(r.createdAt) },
        { label: "Utoljára módosítva", value: formatDateTime(r.updatedAt) },
        { label: "Munkalap lezárva", value: formatDateTime(r.munkalapClosedAt) },
        { label: "Technikusi link érvényes", value: r.technicianTokenExpiresAt ? `${formatDateTime(r.technicianTokenExpiresAt)}-ig` : DASH },
        { label: "Ügyfél-szerkesztési link érvényes", value: r.tokenExpiresAt ? `${formatDateTime(r.tokenExpiresAt)}-ig` : DASH },
        { label: "Rögzített tanúk (meghatalmazás)", value: witnessNames(r.witnessSnapshot) },
        ...(r.pdfErrorMessage ? [{ label: "Utolsó PDF-hiba", value: r.pdfErrorMessage }] : []),
      ],
    },
    {
      title: "Személyes adatok",
      rows: [
        { label: "Tulajdonos típusa", value: optionLabel(OWNER_TYPE_OPTIONS, r.ownerType) },
        { label: r.ownerType === "CEG" ? "Cégnév" : "Tulajdonos neve", value: text(r.ownerName) },
        { label: r.ownerType === "CEG" ? "Székhely" : "Tulajdonos címe", value: text(r.ownerAddress) },
        { label: r.ownerType === "CEG" ? "Adószám" : "Személyazonosító okmány száma", value: text(r.idOrTaxNumber) },
        { label: "A vezető azonos a tulajdonossal", value: yesNo(r.driverSameAsOwner) },
        { label: "Vezető neve", value: text(r.driverName) },
        { label: "Vezető címe", value: text(r.driverAddress) },
        { label: "Vezető telefonszáma", value: text(r.driverPhone) },
        { label: "Vezető születési ideje", value: formatDate(r.driverBirthDate) },
        { label: "Vezetői engedély száma", value: text(r.driverLicenseNumber) },
        { label: "Vezetői engedély érvényes", value: formatDate(r.driverLicenseValidUntil) },
        { label: "E-mail", value: text(r.customerEmail) },
        { label: "Telefon", value: text(r.customerPhone) },
      ],
    },
    {
      title: "Jármű és biztosítás",
      rows: [
        { label: "Rendszám", value: text(r.vehiclePlate) },
        { label: "Gyártmány / típus", value: text(`${r.vehicleMake} ${r.vehicleModel}`) },
        { label: "Évjárat", value: text(r.vehicleYear) },
        { label: "Alvázszám", value: text(r.vehicleVin) },
        { label: "Első forgalomba helyezés", value: formatDate(r.vehicleRegistrationDate) },
        { label: "Műszaki érvényes", value: formatDate(r.vehicleInspectionValidUntil) },
        { label: "Hengerűrtartalom (cm³)", value: text(r.vehicleEngineCapacity) },
        { label: "Teljesítmény (kW)", value: text(r.vehiclePowerKw) },
        { label: "Szín", value: text(r.vehicleColor) },
        { label: "Illetékes biztosító (meghatalmazás)", value: getInsuranceCompanyLabel(r.insuranceCompany as InsuranceCompanyValue | null, r.insuranceCompanyOther) },
        { label: "Van CASCO", value: yesNo(r.hasCasco) },
        { label: "CASCO biztosító", value: text(r.cascoInsurer) },
        { label: "Kötelező biztosító", value: text(r.liabilityInsurer) },
        { label: "Károkozó / másik fél biztosítója", value: text(r.relevantInsurer) },
      ],
    },
    {
      title: "Baleset körülményei",
      rows: [
        { label: "Időpont", value: formatDateTime(r.accidentDate) },
        { label: "Ország", value: text(r.accidentCountry) },
        { label: "Város", value: text(r.accidentCity) },
        { label: "Utca, házszám", value: text(r.accidentStreet) },
        { label: "Településen kívül", value: yesNo(r.outsideSettlement) },
        { label: "Útszám", value: text(r.roadNumber) },
        { label: "Kilométer-szelvény", value: text(r.kilometerMark) },
        { label: "Rendőrség részt vett", value: yesNo(r.policeInvolved) },
        { label: "Rendőrség", value: text(r.policeStation) },
        { label: "Másik jármű rendszáma", value: text(r.otherVehiclePlate) },
        { label: "Másik jármű típusa", value: text(r.otherVehicleType) },
        { label: "Másik jármű színe", value: text(r.otherVehicleColor) },
        { label: "További érintettek", value: text(r.additionalParties) },
        { label: "Szemle helyszíne", value: text(r.vehicleInspectionLocation) },
      ],
    },
    {
      title: "Kár",
      rows: [
        { label: "A kár jellege", value: optionLabel(DAMAGE_TYPE_OPTIONS, r.damageType) },
        { label: "Kárt okozó esemény", value: optionLabel(WINDSHIELD_CAUSE_OPTIONS, r.windshieldCause) },
        { label: "Egyéb körülmények", value: text(r.windshieldCauseOther) },
        { label: "Kár leírása", value: text(r.damageDescription) },
        { label: "Kárvázlat pontok", value: `${damagePointCount} db` },
        { label: "Feltöltött fotók", value: `${r.photoUrls?.length ?? 0} db` },
      ],
    },
    {
      title: "Nyilatkozatok",
      rows: [
        { label: "Felelős fél", value: r.liableParty ? (LIABLE_LABELS[r.liableParty] ?? r.liableParty) : DASH },
        { label: "Alkohol/kábítószer hatása alatt", value: yesNo(r.underInfluence) },
        { label: "Érvényes jogosítvány", value: yesNo(r.licenseValid) },
        { label: "ÁFA-visszatérítésre jogosult", value: yesNo(r.vatReclaimEligible) },
        { label: "Adószám", value: text(r.taxNumber) },
        { label: "Hozzájárul a fotómásoláshoz", value: yesNo(r.consentToPhotocopy) },
        { label: "CASCO kárigény", value: yesNo(r.cascoClaimRequest) },
        { label: "Terhelt jármű", value: yesNo(r.vehicleEncumbrance) },
        { label: "Terhelés jogosultja", value: text(r.encumbranceFinancier) },
        { label: "8 napos fizetés elfogadva", value: yesNo(r.accept8DayPayment) },
        { label: "CASCO feltételek ismerete", value: yesNo(r.knowsCascoTerms) },
        { label: "GDPR hozzájárulás", value: yesNo(r.gdprConsent) },
      ],
    },
    {
      title: "Jegyzőkönyv (technikus)",
      rows: [
        { label: "Technikus", value: text(r.technicianName) },
        { label: "Jármű átvétele", value: formatDateTime(r.vehicleCheckIn) },
        { label: "Jármű visszaadása", value: formatDateTime(r.vehicleCheckOut) },
        { label: "Jármű kategória", value: optionLabel(VEHICLE_CATEGORY_OPTIONS, r.vehicleCategory) },
        { label: "Munkafolyamat", value: optionLabel(WORK_PROCESS_OPTIONS, r.workProcess) },
        { label: "Jármű állapota", value: optionLabel(VEHICLE_CONDITION_OPTIONS, r.vehicleCondition) },
        { label: "Kiválasztott meghatalmazások", value: authorizationLabels },
        { label: "Felszereltség", value: equipmentSummary(r.equipmentChecklist) },
        { label: "Megjegyzések a kárról", value: text(r.damageNotes) },
      ],
    },
  ]
}
