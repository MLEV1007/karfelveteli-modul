// Admin kitöltés-lista: query paraméterek validálása (Zod) és a Prisma where-feltétel építése.
// Tiszta függvények (nincs DB/env) — külön fájlban, hogy egységtesztelhetők legyenek.
// A where-feltétel kizárólag Prisma paraméterezett szűrőket használ (nincs nyers SQL).
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { INSURANCE_COMPANIES, isValidDateOnly } from "./validation"
import { DAMAGE_TYPE_VALUES } from "./damageTypes"

export const PAGE_SIZE = 25
export const MAX_PAGE = 10_000
export const MAX_SEARCH_LENGTH = 100
export const MAX_SEARCH_TOKENS = 5

export const REPORT_STATUS_VALUES = ["PENDING_TECHNICIAN", "COMPLETED", "FAILED_PDF"] as const
export type ReportStatusValue = (typeof REPORT_STATUS_VALUES)[number]

export const STATUS_LABELS: Record<ReportStatusValue, string> = {
  PENDING_TECHNICIAN: "Technikusra vár",
  COMPLETED: "Lezárva",
  FAILED_PDF: "PDF-hiba",
}

export const STATUS_BADGE_CLASSES: Record<ReportStatusValue, string> = {
  PENDING_TECHNICIAN:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-800",
  FAILED_PDF:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800",
}

export interface ReportListFilters {
  q: string
  status?: ReportStatusValue
  insurance?: (typeof INSURANCE_COMPANIES)[number]
  damageType?: (typeof DAMAGE_TYPE_VALUES)[number]
  from?: string // YYYY-MM-DD (budapesti nap)
  to?: string // YYYY-MM-DD (budapesti nap, a nap végéig)
}

export interface ParsedReportListQuery {
  filters: ReportListFilters
  page: number
  /** Azok a paraméterek, amelyek érvénytelenek voltak, és figyelmen kívül maradtak. */
  ignored: string[]
}

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === "string" ? v : undefined
}

const dateParam = z.string().refine(isValidDateOnly, "Érvénytelen dátum")

// Egyetlen paraméter validálása: üres → hiányzó; érvénytelen → figyelmen kívül hagyva (és jelezve)
function parseOne<T>(
  raw: string | undefined,
  schema: z.ZodType<T>,
  name: string,
  ignored: string[]
): T | undefined {
  if (raw === undefined || raw.trim() === "") return undefined
  const result = schema.safeParse(raw.trim())
  if (!result.success) {
    ignored.push(name)
    return undefined
  }
  return result.data
}

/** A keresőszöveg normalizálása: szóközök összevonása, hossz- és szószám-korlát. */
export function normalizeSearch(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_LENGTH)
}

export function parseReportListQuery(params: RawParams): ParsedReportListQuery {
  const ignored: string[] = []

  const q = normalizeSearch(first(params.q) ?? "")
  const status = parseOne(first(params.status), z.enum(REPORT_STATUS_VALUES), "status", ignored)
  const insurance = parseOne(first(params.insurance), z.enum(INSURANCE_COMPANIES), "insurance", ignored)
  const damageType = parseOne(first(params.damageType), z.enum(DAMAGE_TYPE_VALUES), "damageType", ignored)
  let from = parseOne(first(params.from), dateParam, "from", ignored)
  let to = parseOne(first(params.to), dateParam, "to", ignored)
  // Fordított tartomány: felcseréljük, nem hibázunk
  if (from && to && from > to) [from, to] = [to, from]

  const rawPage = first(params.page)
  let page = 1
  if (rawPage !== undefined && rawPage.trim() !== "") {
    const parsed = z.coerce.number().int().min(1).max(MAX_PAGE).safeParse(rawPage.trim())
    if (parsed.success) page = parsed.data
    else ignored.push("page")
  }

  return { filters: { q, status, insurance, damageType, from, to }, page, ignored }
}

/** Budapesti naptári nap 00:00-ja UTC pillanatként (DST-helyes; `dayOffset` napot ad hozzá). */
export function budapestMidnightUtc(dateOnly: string, dayOffset = 0): Date {
  const [y, m, d] = dateOnly.split("-").map(Number)
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const offsetAt = (utcMs: number): number => {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value])
    ) as Record<string, string>
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    )
    return asUtc - utcMs
  }
  const wallMs = Date.UTC(y, m - 1, d + dayOffset, 0, 0, 0)
  // Két iteráció elég a DST-határ körül is
  let guess = wallMs - offsetAt(wallMs)
  guess = wallMs - offsetAt(guess)
  return new Date(guess)
}

/** A keresés mezői: rendszám, ügyfélnév (tulajdonos/vezető), e-mail, BIZT-szám, telefon. */
const SEARCH_FIELDS = [
  "vehiclePlate",
  "ownerName",
  "driverName",
  "customerEmail",
  "referenceNumber",
  "customerPhone",
  "driverPhone",
] as const

export function buildReportWhere(filters: ReportListFilters): Prisma.DamageReportWhereInput {
  const and: Prisma.DamageReportWhereInput[] = []

  // Minden szó (szóközzel elválasztva) külön feltétel (ÉS), egy szó bármelyik mezőben találhat
  // (VAGY), részleges, kis/nagybetű független egyezéssel.
  const tokens = normalizeSearch(filters.q ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TOKENS)
  for (const token of tokens) {
    and.push({
      OR: SEARCH_FIELDS.map((field) => ({
        [field]: { contains: token, mode: "insensitive" as const },
      })) as Prisma.DamageReportWhereInput[],
    })
  }

  if (filters.status) and.push({ status: filters.status })
  if (filters.insurance) and.push({ insuranceCompany: filters.insurance })
  if (filters.damageType) and.push({ damageType: filters.damageType })

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (filters.from) createdAt.gte = budapestMidnightUtc(filters.from)
    if (filters.to) createdAt.lt = budapestMidnightUtc(filters.to, 1)
    and.push({ createdAt })
  }

  return and.length > 0 ? { AND: and } : {}
}

/** Rendezés: létrehozás szerint csökkenő; azonos időpontnál az id a stabil sorrendhez. */
export const REPORT_LIST_ORDER_BY: Prisma.DamageReportOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "desc" },
]

export function pageSkip(page: number): number {
  return (Math.max(1, Math.floor(page)) - 1) * PAGE_SIZE
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

/** Lista URL a szűrőkkel (lapozó linkekhez); az üres értékek kimaradnak. */
export function buildListHref(filters: ReportListFilters, page: number): string {
  const sp = new URLSearchParams()
  if (filters.q) sp.set("q", filters.q)
  if (filters.status) sp.set("status", filters.status)
  if (filters.insurance) sp.set("insurance", filters.insurance)
  if (filters.damageType) sp.set("damageType", filters.damageType)
  if (filters.from) sp.set("from", filters.from)
  if (filters.to) sp.set("to", filters.to)
  if (page > 1) sp.set("page", String(page))
  const qs = sp.toString()
  return qs ? `/admin?${qs}` : "/admin"
}
