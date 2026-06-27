import { z } from "zod"

// A gépjármű felszereltségi checklist (jegyzőkönyv) egyetlen, közös forrása —
// ebből épül a Zod séma, a technikusi form és a PDF Jegyzőkönyv oldal is.
export type EquipmentItemType = "boolean" | "count" | "text" | "number"

export interface EquipmentItemDef {
  key: string
  label: string
  type: EquipmentItemType
  // "number" típusnál a checkbox utáni szám mértékegysége, pl. "sebességes"
  numberSuffix?: string
}

export const EQUIPMENT_CHECKLIST_ITEMS: EquipmentItemDef[] = [
  { key: "doors2", label: "2 ajtós", type: "boolean" },
  { key: "doors3", label: "3 ajtós", type: "boolean" },
  { key: "doors4", label: "4 ajtós", type: "boolean" },
  { key: "doors5", label: "5 ajtós", type: "boolean" },
  { key: "abs", label: "ABS", type: "boolean" },
  { key: "asr", label: "ASR", type: "boolean" },
  { key: "eds", label: "EDS", type: "boolean" },
  { key: "catalystRegulated", label: "Szabályozott katalizátor", type: "boolean" },
  { key: "catalystUnregulated", label: "Szabályozatlan katalizátor", type: "boolean" },
  { key: "towHook", label: "Vonóhorog", type: "boolean" },
  { key: "rearWiper", label: "Hátsó ablaktörlő", type: "boolean" },
  { key: "auxBrakeLight", label: "Pótféklámpa", type: "boolean" },
  { key: "airbagDriver", label: "Légzsák a vezető oldalon", type: "boolean" },
  { key: "airbagPassenger", label: "Légzsák az utasoldalon", type: "boolean" },
  { key: "sideAirbag", label: "Oldallégzsák", type: "count" },
  { key: "curtainAirbag", label: "Függönylégzsák", type: "count" },
  { key: "fogLight", label: "Ködlámpa", type: "count" },
  { key: "tintedGlass", label: "Színezett üveg", type: "boolean" },
  { key: "alarm", label: "Riasztó", type: "text" },
  { key: "immobilizer", label: "Indításgátló", type: "text" },
  { key: "centralLock", label: "Központi zár", type: "boolean" },
  { key: "electricWindow", label: "Elektromos ablak", type: "count" },
  { key: "gearbox5", label: "5 fokozatú váltó", type: "boolean" },
  { key: "gearbox6", label: "6 fokozatú váltó", type: "boolean" },
  { key: "automaticGearbox", label: "Automata váltó", type: "number", numberSuffix: "sebességes" },
  { key: "selfLockingDiff", label: "Önzáró differenciálmű", type: "boolean" },
  { key: "electronicSuspension", label: "Elektronikus futóműszabályozás", type: "boolean" },
  { key: "levelControl", label: "Szintszabályozás", type: "boolean" },
  { key: "powerSteering", label: "Szervokormány", type: "boolean" },
  { key: "headlightWasher", label: "Fényszórómosó", type: "boolean" },
  { key: "ac", label: "Légkondicionáló", type: "boolean" },
  { key: "automaticAc", label: "Automata légkondicionáló", type: "boolean" },
  { key: "headrest", label: "Fejtámla", type: "count" },
  { key: "velourUpholstery", label: "Velúr kárpit", type: "boolean" },
  { key: "leatherUpholstery", label: "Bőrkárpit", type: "boolean" },
  { key: "splitRearSeat", label: "Osztott hátsó ülés", type: "boolean" },
  { key: "childSeat", label: "Gyerekülés", type: "boolean" },
  { key: "skiBag", label: "Sízsák", type: "boolean" },
  { key: "sportSeat", label: "Sportülés", type: "count" },
  { key: "heatedSeat", label: "Fűthető ülés", type: "count" },
  { key: "phone", label: "Telefon", type: "boolean" },
  { key: "onboardComputer", label: "Fedélzeti számítógép", type: "boolean" },
  { key: "outdoorThermometer", label: "Külső hőmérő", type: "boolean" },
  { key: "tachometer", label: "Fordulatszámmérő", type: "boolean" },
  { key: "cruiseControl", label: "Tempomat", type: "boolean" },
  { key: "parkingHeater", label: "Parkolófűtés", type: "boolean" },
  { key: "mechanicalMirror", label: "Mechanikus tükör", type: "count" },
  { key: "electricMirror", label: "Elektromos tükör", type: "count" },
  { key: "sunroof", label: "Napfénytető", type: "count" },
  { key: "tiltRoof", label: "Tolótető", type: "count" },
  { key: "electricTiltRoof", label: "Elektromos tolótető", type: "count" },
]

function itemSchema(def: EquipmentItemDef) {
  if (def.type === "boolean") {
    return z.boolean().default(false)
  }
  if (def.type === "count") {
    return z
      .object({
        checked: z.boolean().default(false),
        count: z.coerce.number().int().min(0).optional(),
      })
      .default({ checked: false })
  }
  if (def.type === "text") {
    return z
      .object({
        checked: z.boolean().default(false),
        type: z.string().optional(),
      })
      .default({ checked: false })
  }
  // number
  return z
    .object({
      checked: z.boolean().default(false),
      value: z.coerce.number().int().min(0).optional(),
    })
    .default({ checked: false })
}

export const equipmentChecklistSchema = z.object(
  Object.fromEntries(EQUIPMENT_CHECKLIST_ITEMS.map((def) => [def.key, itemSchema(def)]))
)

export type EquipmentChecklist = z.infer<typeof equipmentChecklistSchema>

export function getDefaultEquipmentChecklist(): EquipmentChecklist {
  return equipmentChecklistSchema.parse({})
}

type EquipmentValue = boolean | { checked: boolean; count?: number; type?: string; value?: number } | undefined

export function isEquipmentChecked(def: EquipmentItemDef, value: EquipmentValue): boolean {
  if (def.type === "boolean") return !!value
  return !!(value && typeof value === "object" && value.checked)
}

// A checkbox melletti kiegészítő infó (db szám / típus / sebességfokozat) szöveges alakja
export function formatEquipmentDetail(def: EquipmentItemDef, value: EquipmentValue): string {
  if (def.type === "boolean" || !value || typeof value !== "object" || !value.checked) return ""
  if (def.type === "count") return value.count ? ` (${value.count} db)` : ""
  if (def.type === "text") return value.type ? ` / ${value.type}` : ""
  if (def.type === "number") return value.value ? ` (${value.value} ${def.numberSuffix ?? ""})` : ""
  return ""
}
