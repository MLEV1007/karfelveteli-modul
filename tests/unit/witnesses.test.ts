import test from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../lib/db"
import {
  getActiveWitnesses,
  requireTwoActiveWitnesses,
  toSnapshot,
  loadWitnessSignatureDataUrl,
  saveWitnessSignature,
  WitnessError,
} from "../../lib/witnesses"

const row = (id: string, sortOrder: number) => ({
  id, name: `Tanú ${id}`, address: "Fiktív cím", signatureKey: `witnesses/${id}/signature.png`,
  sortOrder, isActive: true, createdAt: new Date(), updatedAt: new Date(),
})

function stubFindMany(rows: unknown[]) {
  const w = prisma.witness as unknown as { findMany: (args: unknown) => Promise<unknown[]> }
  const orig = w.findMany
  let lastArgs: any
  w.findMany = async (args: unknown) => { lastArgs = args; return rows }
  return { restore: () => { w.findMany = orig }, args: () => lastArgs }
}

test("getActiveWitnesses: csak aktívak, sortOrder szerint kérdezve", async () => {
  const st = stubFindMany([row("a", 0), row("b", 1)])
  try {
    const list = await getActiveWitnesses()
    assert.equal(list.length, 2)
    assert.deepEqual(st.args().where, { isActive: true })
    assert.equal(st.args().orderBy[0].sortOrder, "asc")
    assert.equal(list[0].signatureKey, "witnesses/a/signature.png")
  } finally { st.restore() }
})

test("requireTwoActiveWitnesses: pontosan 2 kell", async () => {
  for (const rows of [[], [row("a", 0)], [row("a", 0), row("b", 1), row("c", 2)]]) {
    const st = stubFindMany(rows)
    try {
      await assert.rejects(requireTwoActiveWitnesses(), (e: Error) => e instanceof WitnessError && e.message === "A meghatalmazások csak 2 aktív tanúval készíthetők")
    } finally { st.restore() }
  }
  const st = stubFindMany([row("a", 0), row("b", 1)])
  try {
    const [w1, w2] = await requireTwoActiveWitnesses()
    assert.equal(w1.id, "a"); assert.equal(w2.id, "b")
  } finally { st.restore() }
})

test("toSnapshot: csak id, név, cím, kulcs", () => {
  const snap = toSnapshot([{ ...row("a", 0) }])
  assert.deepEqual(Object.keys(snap[0]).sort(), ["address", "id", "name", "signatureKey"])
})

test("érvénytelen kulcs / azonosító / hiányzó bemenet -> WitnessError", async () => {
  await assert.rejects(loadWitnessSignatureDataUrl("../../etc/passwd"), WitnessError)
  await assert.rejects(saveWitnessSignature({ witnessId: "../x", dataUrl: "x" }), WitnessError)
  await assert.rejects(saveWitnessSignature({ witnessId: "abc" }), WitnessError)
  await assert.rejects(saveWitnessSignature({ witnessId: "abc", imageBytes: new Uint8Array(5), mimeType: "image/png" }), WitnessError)
})
