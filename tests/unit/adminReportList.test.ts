import test from "node:test"
import assert from "node:assert/strict"
import {
  PAGE_SIZE,
  MAX_PAGE,
  parseReportListQuery,
  buildReportWhere,
  budapestMidnightUtc,
  pageSkip,
  totalPages,
  buildListHref,
  normalizeSearch,
  REPORT_LIST_ORDER_BY,
} from "../../lib/adminReportList"

test("üres query: alapértékek, nincs szűrő", () => {
  const r = parseReportListQuery({})
  assert.deepEqual(r.filters, { q: "", status: undefined, insurance: undefined, damageType: undefined, from: undefined, to: undefined })
  assert.equal(r.page, 1)
  assert.deepEqual(r.ignored, [])
  assert.deepEqual(buildReportWhere(r.filters), {})
})

test("érvényes szűrők átmennek, a tömb-paraméter első eleme számít", () => {
  const r = parseReportListQuery({
    status: ["FAILED_PDF", "COMPLETED"],
    insurance: "ALLIANZ",
    damageType: "SZELVEDO_CSERE",
    from: "2026-01-02",
    to: "2026-02-03",
    page: "3",
  })
  assert.equal(r.filters.status, "FAILED_PDF")
  assert.equal(r.filters.insurance, "ALLIANZ")
  assert.equal(r.filters.damageType, "SZELVEDO_CSERE")
  assert.equal(r.filters.from, "2026-01-02")
  assert.equal(r.filters.to, "2026-02-03")
  assert.equal(r.page, 3)
})

test("érvénytelen értékek figyelmen kívül maradnak és jelezve vannak (SQL-injekciós próbák is)", () => {
  const r = parseReportListQuery({
    status: "COMPLETED' OR 1=1 --",
    insurance: "NEMLETEZIK",
    damageType: "x",
    from: "2026-02-31",
    to: "holnap",
    page: "-5",
  })
  assert.equal(r.filters.status, undefined)
  assert.equal(r.filters.insurance, undefined)
  assert.equal(r.filters.damageType, undefined)
  assert.equal(r.filters.from, undefined)
  assert.equal(r.filters.to, undefined)
  assert.equal(r.page, 1)
  assert.deepEqual(r.ignored.sort(), ["damageType", "from", "insurance", "page", "status", "to"])
})

test("oldalszám: tört, szöveg, túl nagy érték → 1 + jelzés; a határ még érvényes", () => {
  for (const bad of ["1.5", "abc", "0", String(MAX_PAGE + 1), "1e9"]) {
    const r = parseReportListQuery({ page: bad })
    assert.equal(r.page, 1, bad)
    assert.ok(r.ignored.includes("page"), bad)
  }
  assert.equal(parseReportListQuery({ page: String(MAX_PAGE) }).page, MAX_PAGE)
})

test("fordított dátumtartomány felcserélődik", () => {
  const r = parseReportListQuery({ from: "2026-05-10", to: "2026-05-01" })
  assert.equal(r.filters.from, "2026-05-01")
  assert.equal(r.filters.to, "2026-05-10")
})

test("keresés: szóköz-összevonás, hossz- és szó-korlát", () => {
  assert.equal(normalizeSearch("  Kovács    János  "), "Kovács János")
  assert.equal(normalizeSearch("a".repeat(500)).length, 100)
  const where = buildReportWhere({ q: "a b c d e f g h" })
  assert.equal((where.AND as unknown[]).length, 5) // legfeljebb 5 szó
})

test("keresés: minden szó VAGY-ol az összes mezőn, kis/nagybetű független, részleges (contains)", () => {
  const where = buildReportWhere({ q: "abc 301" })
  const and = where.AND as { OR: Record<string, { contains: string; mode: string }>[] }[]
  assert.equal(and.length, 2)
  const fields = and[0].OR.map((c) => Object.keys(c)[0]).sort()
  assert.deepEqual(fields, ["customerEmail", "customerPhone", "driverName", "driverPhone", "ownerName", "referenceNumber", "vehiclePlate"])
  for (const clause of and[0].OR) {
    const f = Object.values(clause)[0]
    assert.equal(f.contains, "abc")
    assert.equal(f.mode, "insensitive")
  }
  assert.equal(Object.values(and[1].OR[0])[0].contains, "301")
})

test("a keresőszöveg SOHA nem kerül nyers SQL-be: csak Prisma contains érték", () => {
  const evil = "'; DROP TABLE \"DamageReport\"; --"
  const where = buildReportWhere({ q: evil })
  const json = JSON.stringify(where)
  assert.ok(json.includes("contains"))
  assert.ok(!json.includes("$queryRaw"))
  // az érték szó szerint, változtatás nélkül (paraméterként) van benne — szóközökkel szavakra bontva
  assert.ok(json.includes(JSON.stringify("DROP").slice(1, -1)))
})

test("szűrők ÉS-sel kapcsolódnak", () => {
  const where = buildReportWhere({ q: "", status: "FAILED_PDF", insurance: "UNIQA", damageType: "EGYEB" })
  assert.deepEqual(where.AND, [{ status: "FAILED_PDF" }, { insuranceCompany: "UNIQA" }, { damageType: "EGYEB" }])
})

test("dátumtartomány: budapesti nap, a 'to' napja is benne van (lt a következő nap éjfélig)", () => {
  const where = buildReportWhere({ q: "", from: "2026-07-01", to: "2026-07-01" })
  const range = (where.AND as { createdAt: { gte: Date; lt: Date } }[])[0].createdAt
  assert.equal(range.gte.toISOString(), "2026-06-30T22:00:00.000Z") // nyári idő: UTC+2
  assert.equal(range.lt.toISOString(), "2026-07-01T22:00:00.000Z")
})

test("budapestMidnightUtc: téli idő, DST-váltás napjai", () => {
  assert.equal(budapestMidnightUtc("2026-01-15").toISOString(), "2026-01-14T23:00:00.000Z")
  // 2026-03-29: óraátállítás (02:00 -> 03:00); az éjfél még téli idő, a következő éjfél már nyári
  assert.equal(budapestMidnightUtc("2026-03-29").toISOString(), "2026-03-28T23:00:00.000Z")
  assert.equal(budapestMidnightUtc("2026-03-29", 1).toISOString(), "2026-03-29T22:00:00.000Z")
  // 2026-10-25: visszaállás
  assert.equal(budapestMidnightUtc("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z")
  assert.equal(budapestMidnightUtc("2026-10-25", 1).toISOString(), "2026-10-24T23:00:00.000Z".replace("24T23", "25T23"))
})

test("rendezés létrehozás szerint csökkenő, id a tie-break", () => {
  assert.deepEqual(REPORT_LIST_ORDER_BY, [{ createdAt: "desc" }, { id: "desc" }])
})

test("lapozás: 25/oldal, skip és oldalszám", () => {
  assert.equal(PAGE_SIZE, 25)
  assert.equal(pageSkip(1), 0)
  assert.equal(pageSkip(3), 50)
  assert.equal(pageSkip(0), 0)
  assert.equal(totalPages(0), 1)
  assert.equal(totalPages(25), 1)
  assert.equal(totalPages(26), 2)
})

test("buildListHref: üres értékek kimaradnak, a szűrők megmaradnak", () => {
  assert.equal(buildListHref({ q: "" }, 1), "/admin")
  assert.equal(buildListHref({ q: "abc 12", status: "FAILED_PDF" }, 2), "/admin?q=abc+12&status=FAILED_PDF&page=2")
})
