// Mezőnkénti előtte/utána különbség az auditnaplóhoz. Tiszta függvények.
// Biztonság: aláírás-, fotó-, token- és URL-jellegű kulcsok SOHA nem kerülnek a naplóba
// (kulcsnév alapú tiltólista + csak a szerkeszthető mezők engedélyezett listája).

export const DIFF_FIELDS = [
  "ownerType", "ownerName", "ownerAddress", "idOrTaxNumber", "driverSameAsOwner", "driverName",
  "driverAddress", "driverPhone", "driverBirthDate", "driverLicenseNumber", "driverLicenseValidUntil",
  "customerEmail", "customerPhone",
  "vehiclePlate", "vehicleMake", "vehicleModel", "vehicleYear", "vehicleVin", "hasCasco", "cascoInsurer",
  "liabilityInsurer", "relevantInsurer", "insuranceCompany", "insuranceCompanyOther",
  "accidentDate", "accidentCountry", "accidentCity", "accidentStreet", "outsideSettlement", "roadNumber",
  "kilometerMark", "policeInvolved", "policeStation", "otherVehiclePlate", "otherVehicleType",
  "otherVehicleColor", "additionalParties", "vehicleInspectionLocation",
  "damageType", "windshieldCause", "windshieldCauseOther", "damageDescription", "damagePoints",
  "liableParty", "underInfluence", "licenseValid", "vatReclaimEligible", "taxNumber", "consentToPhotocopy",
  "cascoClaimRequest", "vehicleEncumbrance",
  "vehicleCategory", "workProcess", "vehicleCondition", "selectedAuthorizations",
] as const

/** Ezeknél csak a változás ténye kerül a naplóba (nagy / nem szöveges tartalom). */
export const OPAQUE_FIELDS: ReadonlySet<string> = new Set(["damagePoints"])

/** Soha nem naplózható kulcsnevek (védelmi háló a mezőlista mellett). */
const FORBIDDEN_KEY = /signature|aláír|alair|photoUrl|fotoUrl|token|url|password|secret|hash/i

const MAX_VALUE_LENGTH = 500

export type DiffValue = string | number | boolean | string[] | null

export interface FieldChange {
  field: string
  before?: DiffValue
  after?: DiffValue
  /** true: a tartalom nem kerül a naplóba, csak a változás ténye */
  opaque?: true
}

/** Összehasonlításra normalizált érték: Date → ISO, ""/undefined → null, tömb/objektum → stabil JSON. */
export function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === "string") return value.trim() === "" ? null : value
  if (Array.isArray(value)) return value.length === 0 ? null : value
  return value
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v
  )
}

function loggable(value: unknown): DiffValue {
  const n = normalizeValue(value)
  if (n === null) return null
  if (typeof n === "string") return n.length > MAX_VALUE_LENGTH ? `${n.slice(0, MAX_VALUE_LENGTH)}…` : n
  if (typeof n === "number" || typeof n === "boolean") return n
  if (Array.isArray(n) && n.every((x) => typeof x === "string")) return n as string[]
  const json = stable(n)
  return json.length > MAX_VALUE_LENGTH ? `${json.slice(0, MAX_VALUE_LENGTH)}…` : json
}

/** Csak az összehasonlításhoz (a naplózott érték változatlan): a meghatalmazás-lista sorrendje nem számít (null/üres = null). */
function sortedForCompare(field: string, n: unknown): unknown {
  if (field === "selectedAuthorizations" && Array.isArray(n)) return [...n].sort()
  return n
}

/**
 * A `before` és `after` objektum különbsége a megadott mezőkre (alapértelmezés: DIFF_FIELDS).
 * Csak a valóban változott mezők szerepelnek; a tiltott kulcsnevű mezők mindig kimaradnak.
 */
export function computeFieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[] = DIFF_FIELDS
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const field of fields) {
    if (FORBIDDEN_KEY.test(field)) continue
    const b = normalizeValue(before[field])
    const a = normalizeValue(after[field])
    if (stable(sortedForCompare(field, b)) === stable(sortedForCompare(field, a))) continue
    if (OPAQUE_FIELDS.has(field)) {
      changes.push({ field, opaque: true })
    } else {
      changes.push({ field, before: loggable(b), after: loggable(a) })
    }
  }
  return changes
}
