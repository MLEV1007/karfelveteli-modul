// A Jegyzőkönyv (technikusi lezárás) kizárólagos-választós mezőcsoportjai — mindegyik
// mindig kitöltendő, két lehetséges érték közül választva (nem szabadon kombinálható
// checkbox-lista, mint az EQUIPMENT_CHECKLIST_ITEMS). A web-form RadioGroup-ként, a PDF
// a meglévő checkBox/checkBoxFilled stílussal, egymás alatt jeleníti meg őket.
// Lásd: karfelveteli_modul/terv-uj-fejlesztesek-2026-08.md, 2. szakasz.

export const VEHICLE_CATEGORY_OPTIONS = [
  { value: "SZEMELYGEPKOCSI", label: "Személygépkocsi" },
  { value: "TEHERGEPKOCSI", label: "Tehergépkocsi" },
] as const

export type VehicleCategoryValue = (typeof VEHICLE_CATEGORY_OPTIONS)[number]["value"]
export const VEHICLE_CATEGORY_VALUES = VEHICLE_CATEGORY_OPTIONS.map((o) => o.value) as [
  VehicleCategoryValue,
  ...VehicleCategoryValue[],
]

export const WORK_PROCESS_OPTIONS = [
  { value: "CSERE", label: "Csere" },
  { value: "JAVITAS", label: "Javítás" },
] as const

export type WorkProcessValue = (typeof WORK_PROCESS_OPTIONS)[number]["value"]
export const WORK_PROCESS_VALUES = WORK_PROCESS_OPTIONS.map((o) => o.value) as [
  WorkProcessValue,
  ...WorkProcessValue[],
]

export const VEHICLE_CONDITION_OPTIONS = [
  { value: "MOZGASKEPES", label: "Mozgásképes" },
  { value: "MOZGASKEPTELEN", label: "Mozgásképtelen" },
] as const

export type VehicleConditionValue = (typeof VEHICLE_CONDITION_OPTIONS)[number]["value"]
export const VEHICLE_CONDITION_VALUES = VEHICLE_CONDITION_OPTIONS.map((o) => o.value) as [
  VehicleConditionValue,
  ...VehicleConditionValue[],
]

// ÁFA-visszatérítési jogosultság — a Jegyzőkönyvön és a Meghatalmazáson Igen/Nem
// kizárólagos választóként jelenik meg (az adat a vatReclaimEligible boolean mező).
export const VAT_RECLAIM_OPTIONS = [
  { value: "IGEN", label: "Igen" },
  { value: "NEM", label: "Nem" },
] as const

export function getOptionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined
): string {
  return options.find((opt) => opt.value === value)?.label ?? "—"
}
