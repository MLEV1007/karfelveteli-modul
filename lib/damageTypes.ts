// A kárleírás gyors opciói (4. lépés) — a Prisma DamageType enummal szinkronban tartva.
// Lásd terv-ugyfel-visszajelzes-2026-09.md, 3.1 pont.

export const DAMAGE_TYPE_OPTIONS = [
  { value: "SZELVEDO_JAVITAS", label: "Szélvédőjavítás" },
  { value: "SZELVEDO_CSERE", label: "Szélvédőcsere" },
  { value: "EGYEB", label: "Egyéb kár (szabad leírás)" },
] as const

export type DamageTypeValue = (typeof DAMAGE_TYPE_OPTIONS)[number]["value"]
export const DAMAGE_TYPE_VALUES = DAMAGE_TYPE_OPTIONS.map((o) => o.value) as [
  DamageTypeValue,
  ...DamageTypeValue[],
]

// ─────────────────────────────────────────────────────────────
// Szélvédős kár oka ("A kárt okozó esemény") — a Prisma WindshieldCause enummal szinkronban
// ─────────────────────────────────────────────────────────────
export const WINDSHIELD_CAUSE_OPTIONS = [
  { value: "KAVICS", label: "Felpattanó kavics" },
  { value: "MADAR", label: "Madár" },
  { value: "IDEGEN_TARGY", label: "Idegen tárgy" },
  { value: "EGYEB", label: "Egyéb" },
] as const

export type WindshieldCauseValue = (typeof WINDSHIELD_CAUSE_OPTIONS)[number]["value"]
export const WINDSHIELD_CAUSE_VALUES = WINDSHIELD_CAUSE_OPTIONS.map((o) => o.value) as [
  WindshieldCauseValue,
  ...WindshieldCauseValue[],
]

type PresetCause = Exclude<WindshieldCauseValue, "EGYEB">
type WindshieldDamageType = "SZELVEDO_JAVITAS" | "SZELVEDO_CSERE"

// A kárleírás előre kitöltött szövege az (ártípus × ok) párosból. EGY HELYEN módosítható.
// - KAVICS: végleges, az ügyféltől kapott szöveg (2026-09-24).
// - MADAR, IDEGEN_TARGY: IDEIGLENES — az ügyfélnek jóvá kell hagynia.
// - EGYEB: nincs sablon — az ügyfél a saját szavaival írja le (lásd getPresetDescription).
const WINDSHIELD_PRESET_TEXTS: Record<PresetCause, Record<WindshieldDamageType, string>> = {
  KAVICS: {
    SZELVEDO_JAVITAS:
      "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a sérülés javítható.",
    SZELVEDO_CSERE:
      "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a szélvédő cseréje szükséges.",
  },
  // IDEIGLENES — az ügyfélnek jóvá kell hagynia
  MADAR: {
    SZELVEDO_JAVITAS:
      "Menet közben egy madár a gépjármű szélvédőjének ütközött és megsértette azt, a sérülés javítható.",
    SZELVEDO_CSERE:
      "Menet közben egy madár a gépjármű szélvédőjének ütközött és megsértette azt, a szélvédő cseréje szükséges.",
  },
  // IDEIGLENES — az ügyfélnek jóvá kell hagynia
  IDEGEN_TARGY: {
    SZELVEDO_JAVITAS:
      "Egy idegen tárgy megsértette a gépjármű szélvédőjét, a sérülés javítható.",
    SZELVEDO_CSERE:
      "Egy idegen tárgy megsértette a gépjármű szélvédőjét, a szélvédő cseréje szükséges.",
  },
}

/**
 * Az (ártípus × ok) párosból az előre kitöltendő kárleírás. Üres string, ha nincs sablon:
 * nem szélvédős típus, hiányzó ok, vagy EGYEB ok (ilyenkor a leírást az ügyfél írja meg,
 * a körülményeket a windshieldCauseOther mező rögzíti külön).
 */
export function getPresetDescription(
  damageType: string | null | undefined,
  cause: string | null | undefined
): string {
  if (damageType !== "SZELVEDO_JAVITAS" && damageType !== "SZELVEDO_CSERE") return ""
  if (cause !== "KAVICS" && cause !== "MADAR" && cause !== "IDEGEN_TARGY") return ""
  return WINDSHIELD_PRESET_TEXTS[cause][damageType]
}

// Visszafelé kompatibilis nézet: a KAVICS (korábbi, egyetlen) sablonok.
export const DAMAGE_TYPE_PRESET_DESCRIPTIONS: Partial<Record<DamageTypeValue, string>> = {
  SZELVEDO_JAVITAS: WINDSHIELD_PRESET_TEXTS.KAVICS.SZELVEDO_JAVITAS,
  SZELVEDO_CSERE: WINDSHIELD_PRESET_TEXTS.KAVICS.SZELVEDO_CSERE,
}

const ALL_PRESET_DESCRIPTIONS: string[] = Object.values(WINDSHIELD_PRESET_TEXTS).flatMap((byType) =>
  Object.values(byType)
)

// Igaz, ha a leírás üres, vagy BÁRMELYIK előre megadott sablon változtatás nélkül —
// ilyenkor típus-/okváltáskor felülírható anélkül, hogy az ügyfél saját szövege elveszne.
export function isPresetOrEmptyDescription(text: string | null | undefined): boolean {
  const t = (text ?? "").trim()
  if (!t) return true
  return ALL_PRESET_DESCRIPTIONS.includes(t)
}

/**
 * Típus- vagy okváltáskor a kárleírás új értéke: a sablon (vagy üres), ha a jelenlegi szöveg
 * üres/sablon; különben a felhasználó saját szövege változatlanul.
 */
export function nextDescriptionOnChange(
  currentDescription: string | null | undefined,
  damageType: string | null | undefined,
  cause: string | null | undefined
): string {
  if (!isPresetOrEmptyDescription(currentDescription)) return currentDescription ?? ""
  return getPresetDescription(damageType, cause)
}

export function isWindshieldDamage(value: string | null | undefined): boolean {
  return value === "SZELVEDO_JAVITAS" || value === "SZELVEDO_CSERE"
}

/**
 * A szélvédő-ok szabályai (kliens és szerver közös forrása): szélvédős típusnál az ok kötelező;
 * EGYEB oknál a körülmények szabad szöveges leírása is. Hibák: { path, message } lista.
 */
export function windshieldCauseIssues(data: {
  damageType?: string | null
  windshieldCause?: string | null
  windshieldCauseOther?: string | null
}): { path: "windshieldCause" | "windshieldCauseOther"; message: string }[] {
  if (!isWindshieldDamage(data.damageType)) return []
  if (!data.windshieldCause) {
    return [{ path: "windshieldCause", message: "Válassza ki a kárt okozó eseményt" }]
  }
  if (data.windshieldCause === "EGYEB" && !data.windshieldCauseOther?.trim()) {
    return [{ path: "windshieldCauseOther", message: "Írja le a káresemény pontos körülményeit" }]
  }
  return []
}

/**
 * Mentéshez normalizált értékek: nem szélvédős típusnál (és nem EGYEB oknál az "other") null.
 * `damageType === undefined` (a szerkesztésben nem küldött mező) esetén undefined: nem módosít.
 */
export function normalizeWindshieldCause(data: {
  damageType?: string | null
  windshieldCause?: string | null
  windshieldCauseOther?: string | null
}): { windshieldCause: WindshieldCauseValue | null | undefined; windshieldCauseOther: string | null | undefined } {
  if (data.damageType === undefined) return { windshieldCause: undefined, windshieldCauseOther: undefined }
  if (!isWindshieldDamage(data.damageType) || !data.windshieldCause) {
    return { windshieldCause: null, windshieldCauseOther: null }
  }
  const cause = data.windshieldCause as WindshieldCauseValue
  return {
    windshieldCause: cause,
    windshieldCauseOther: cause === "EGYEB" ? data.windshieldCauseOther?.trim() || null : null,
  }
}
