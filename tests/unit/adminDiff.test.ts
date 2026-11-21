import test from "node:test"
import assert from "node:assert/strict"
import { computeFieldDiff, DIFF_FIELDS, normalizeValue } from "../../lib/adminDiff"

test("csak a változott mezők szerepelnek, előtte/utána értékkel", () => {
  const d = computeFieldDiff({ ownerName: "A", vehiclePlate: "X" }, { ownerName: "B", vehiclePlate: "X" })
  assert.deepEqual(d, [{ field: "ownerName", before: "A", after: "B" }])
})

test("null / undefined / üres string / szóközös string egyenértékű (nincs hamis változás)", () => {
  const d = computeFieldDiff(
    { ownerAddress: null, driverName: "", driverAddress: undefined, roadNumber: "  " },
    { ownerAddress: "", driverName: null, driverAddress: "", roadNumber: undefined }
  )
  assert.deepEqual(d, [])
})

test("dátumok ISO-ként hasonlítódnak; azonos pillanat nem változás", () => {
  const a = new Date("2026-05-01T10:00:00.000Z")
  const same = new Date("2026-05-01T10:00:00.000Z")
  assert.deepEqual(computeFieldDiff({ accidentDate: a }, { accidentDate: same }), [])
  const d = computeFieldDiff({ accidentDate: a }, { accidentDate: new Date("2026-05-02T10:00:00.000Z") })
  assert.deepEqual(d, [{ field: "accidentDate", before: "2026-05-01T10:00:00.000Z", after: "2026-05-02T10:00:00.000Z" }])
})

test("bool és szám változás; 0 és false nem tűnik null-nak", () => {
  const d = computeFieldDiff({ hasCasco: true, vehicleYear: 0 }, { hasCasco: false, vehicleYear: null })
  assert.deepEqual(d, [
    { field: "vehicleYear", before: 0, after: null },
    { field: "hasCasco", before: true, after: false },
  ].sort((a, b) => DIFF_FIELDS.indexOf(a.field as never) - DIFF_FIELDS.indexOf(b.field as never)))
})

test("tömb (selectedAuthorizations): változás kimutatva, azonos tartalom nem", () => {
  assert.deepEqual(computeFieldDiff({ selectedAuthorizations: ["m1"] }, { selectedAuthorizations: ["m1"] }), [])
  assert.deepEqual(computeFieldDiff({ selectedAuthorizations: ["m1"] }, { selectedAuthorizations: ["m1", "bodrogi"] }), [
    { field: "selectedAuthorizations", before: ["m1"], after: ["m1", "bodrogi"] },
  ])
})

test("a damagePoints tartalma nem kerül a naplóba, csak a változás ténye", () => {
  const d = computeFieldDiff({ damagePoints: [{ x: 1, y: 2 }] }, { damagePoints: [{ x: 5, y: 2 }] })
  assert.deepEqual(d, [{ field: "damagePoints", opaque: true }])
  // kulcssorrend-független összehasonlítás
  assert.deepEqual(computeFieldDiff({ damagePoints: [{ x: 1, y: 2 }] }, { damagePoints: [{ y: 2, x: 1 }] }), [])
})

test("aláírás-, fotó-, token-, URL-jellegű kulcsok SOHA nem kerülnek a naplóba (explicit mezőlistával sem)", () => {
  const before = { ownerSignatureUrl: "a", photoUrls: ["u1"], editToken: "t1", technicianToken: "x", finalPdfUrl: "p", ownerName: "A" }
  const after = { ownerSignatureUrl: "b", photoUrls: ["u2"], editToken: "t2", technicianToken: "y", finalPdfUrl: "q", ownerName: "B" }
  const d = computeFieldDiff(before, after, Object.keys(before))
  assert.deepEqual(d, [{ field: "ownerName", before: "A", after: "B" }])
  for (const f of DIFF_FIELDS) assert.ok(!/signature|photoUrl|token|url/i.test(f), f)
})

test("hosszú szöveg csonkolva kerül a naplóba", () => {
  const d = computeFieldDiff({ damageDescription: "a" }, { damageDescription: "b".repeat(2000) })
  assert.equal(d.length, 1)
  assert.ok(String(d[0].after).length <= 501)
})

test("csak a megadott mezőkre számol", () => {
  const d = computeFieldDiff({ name: "A", address: "X" }, { name: "B", address: "Y" }, ["name"])
  assert.deepEqual(d, [{ field: "name", before: "A", after: "B" }])
})

test("normalizeValue", () => {
  assert.equal(normalizeValue(undefined), null)
  assert.equal(normalizeValue(""), null)
  assert.equal(normalizeValue([]), null)
  assert.equal(normalizeValue(false), false)
  assert.equal(normalizeValue(new Date("invalid")), null)
})

test("a consentToPhotocopy mező (nem fotó-URL) normálisan naplózódik", () => {
  assert.deepEqual(computeFieldDiff({ consentToPhotocopy: false }, { consentToPhotocopy: true }), [
    { field: "consentToPhotocopy", before: false, after: true },
  ])
})
