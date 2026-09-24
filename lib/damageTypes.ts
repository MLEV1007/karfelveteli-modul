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

// A két szélvédős opció kiválasztásakor a kárleírás automatikusan ezzel a mondattal
// töltődik ki (utána szabadon módosítható). EGY HELYEN módosítható szöveg.
// Végleges, az ügyféltől kapott szöveg (2026-09-24).
export const DAMAGE_TYPE_PRESET_DESCRIPTIONS: Partial<Record<DamageTypeValue, string>> = {
  SZELVEDO_JAVITAS:
    "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a sérülés javítható.",
  SZELVEDO_CSERE:
    "Az előttem haladó járműről felpattanó kavics megsértette a gépjármű szélvédőjét, a szélvédő cseréje szükséges.",
}

// Igaz, ha a leírás üres, vagy valamelyik előre megadott mondat változtatás nélkül —
// ilyenkor egy másik opció választása felülírhatja anélkül, hogy az ügyfél saját
// szövege elveszne.
export function isPresetOrEmptyDescription(text: string | null | undefined): boolean {
  const t = (text ?? "").trim()
  if (!t) return true
  return Object.values(DAMAGE_TYPE_PRESET_DESCRIPTIONS).some((preset) => preset === t)
}

export function isWindshieldDamage(value: string | null | undefined): boolean {
  return value === "SZELVEDO_JAVITAS" || value === "SZELVEDO_CSERE"
}
