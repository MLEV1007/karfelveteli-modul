// A tulajdonos (meghatalmazó) típusa — a Prisma OwnerType enummal szinkronban tartva.
// A feliratok (név/cégnév, lakcím/székhely, okmányszám/adószám) ehhez igazodnak az
// űrlapon, a PDF-eken és a meghatalmazás szövegében. Az azonosító értéke típustól
// függetlenül az idOrTaxNumber mezőbe kerül. Lásd terv-ugyfel-visszajelzes-2026-09.md, 5.2.

export const OWNER_TYPE_OPTIONS = [
  { value: "MAGANSZEMELY", label: "Magánszemély" },
  { value: "CEG", label: "Cég" },
] as const

export type OwnerTypeValue = (typeof OWNER_TYPE_OPTIONS)[number]["value"]
export const OWNER_TYPE_VALUES = OWNER_TYPE_OPTIONS.map((o) => o.value) as [
  OwnerTypeValue,
  ...OwnerTypeValue[],
]

// Magyar adószám: 8 számjegy - 1 számjegy - 2 számjegy (pl. 12345678-1-12)
export const TAX_NUMBER_REGEX = /^\d{8}-\d-\d{2}$/

export interface OwnerLabels {
  name: string
  address: string
  id: string
  // a meghatalmazás szövegében: "(lakcím: …, személyazonosító okmány száma: …)"
  addressInText: string
  idInText: string
}

export function getOwnerLabels(ownerType?: string | null): OwnerLabels {
  if (ownerType === "CEG") {
    return { name: "Cégnév", address: "Székhely", id: "Adószám", addressInText: "székhely", idInText: "adószám" }
  }
  if (ownerType === "MAGANSZEMELY") {
    return {
      name: "Név",
      address: "Lakcím",
      id: "Személyazonosító okmány száma",
      addressInText: "lakcím",
      idInText: "személyazonosító okmány száma",
    }
  }
  // Korábbi kárügyek (ownerType nélkül) — a régi, közös feliratok
  return {
    name: "Név",
    address: "Lakcím",
    id: "Személyi igazolvány- / adószám",
    addressInText: "lakcím",
    idInText: "személyi igazolvány- vagy adószám",
  }
}
