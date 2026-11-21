import test from "node:test"
import assert from "node:assert/strict"
import { parseStorageRef } from "../../lib/storageRef"

const BASE = "https://abc.supabase.co/storage/v1/object"

test("public URL → bucket + útvonal", () => {
  assert.deepEqual(parseStorageRef(`${BASE}/public/signatures/ABC-123/2026-01-02_x/owner_alairas.png`), {
    bucket: "signatures",
    path: "ABC-123/2026-01-02_x/owner_alairas.png",
  })
  assert.deepEqual(parseStorageRef(`${BASE}/public/reports/ABC/x/karfelvetel-osszevont.pdf?t=1`), {
    bucket: "reports",
    path: "ABC/x/karfelvetel-osszevont.pdf",
  })
})

test("kódolt karakterek visszafejtve", () => {
  assert.equal(parseStorageRef(`${BASE}/public/reports/a%20b/c.pdf`)?.path, "a b/c.pdf")
})

test("ismeretlen bucket, idegen URL, útvonal-kijárás, üres → null", () => {
  assert.equal(parseStorageRef(`${BASE}/public/mas-bucket/x.png`), null)
  assert.equal(parseStorageRef("https://cdn.example.com/uploads/x/foto_1.jpg"), null)
  assert.equal(parseStorageRef(`${BASE}/public/reports/../signatures/x.png`), null)
  assert.equal(parseStorageRef(`${BASE}/public/reports/%2e%2e/x.png`), null)
  assert.equal(parseStorageRef(`${BASE}/public/reports/`), null)
  assert.equal(parseStorageRef(null), null)
  assert.equal(parseStorageRef(""), null)
})
