import test from "node:test"
import assert from "node:assert/strict"
import {
  activeWitnessWarning,
  checkActivation,
  checkDeletable,
  collectReferencedWitnessIds,
  countActive,
  defaultActiveForNew,
  isWitnessReferenced,
  moveWitness,
  witnessIdsInSnapshot,
} from "../../lib/adminWitnessRules"

const w = (id: string, isActive: boolean, sortOrder = 0) => ({ id, isActive, sortOrder })

test("aktívak száma és figyelmeztetés: csak pontosan 2 esetén nincs", () => {
  assert.equal(countActive([w("a", true), w("b", false), w("c", true)]), 2)
  assert.equal(activeWitnessWarning(2), null)
  assert.match(activeWitnessWarning(1)!, /1 aktív tanú/)
  assert.match(activeWitnessWarning(0)!, /0 aktív tanú/)
  assert.match(activeWitnessWarning(3)!, /3 aktív tanú/)
})

test("aktiválás: 2 aktív fölé nem engedett, érthető üzenettel", () => {
  const list = [w("a", true), w("b", true), w("c", false)]
  const r = checkActivation(list, "c")
  assert.equal(r.ok, false)
  assert.match((r as { error: string }).error, /előbb inaktiválj egyet/i)
})

test("aktiválás: 2 alatt megengedett; már aktív nem hiba; ismeretlen id hiba", () => {
  assert.deepEqual(checkActivation([w("a", true), w("b", false)], "b"), { ok: true })
  assert.deepEqual(checkActivation([w("a", true), w("b", true)], "a"), { ok: true })
  assert.equal(checkActivation([w("a", true)], "zzz").ok, false)
})

test("új tanú alapból aktív, ha még nincs 2 aktív", () => {
  assert.equal(defaultActiveForNew(0), true)
  assert.equal(defaultActiveForNew(1), true)
  assert.equal(defaultActiveForNew(2), false)
})

test("snapshot-hivatkozások kinyerése; hibás JSON alakok nem dobnak", () => {
  assert.deepEqual(witnessIdsInSnapshot([{ id: "a", name: "x" }, { id: "b" }]), ["a", "b"])
  for (const bad of [null, undefined, "str", 5, {}, [null], [{}], [{ id: 5 }], [[1]]]) {
    assert.deepEqual(witnessIdsInSnapshot(bad), [], JSON.stringify(bad))
  }
})

test("törölhetőség: hivatkozott tanú nem törölhető, csak inaktiválható", () => {
  const snapshots = [null, [{ id: "a" }, { id: "b" }], [{ id: "c" }]]
  assert.equal(isWitnessReferenced("a", snapshots), true)
  assert.equal(isWitnessReferenced("zzz", snapshots), false)
  const blocked = checkDeletable("c", snapshots)
  assert.equal(blocked.ok, false)
  assert.match((blocked as { error: string }).error, /inaktiválható/)
  assert.deepEqual(checkDeletable("zzz", snapshots), { ok: true })
  assert.deepEqual(checkDeletable("a", []), { ok: true })
})

test("hivatkozott id-k halmaza", () => {
  assert.deepEqual(Array.from(collectReferencedWitnessIds([[{ id: "a" }], [{ id: "a" }, { id: "b" }], null])).sort(), ["a", "b"])
})

test("sorrend: feljebb/lejjebb csere, folytonos újraszámozás; a határon null; azonos sortOrder-nél is működik", () => {
  const list = [w("a", true, 0), w("b", true, 1), w("c", false, 2)]
  assert.deepEqual(moveWitness(list, "b", "up"), [
    { id: "b", sortOrder: 0 },
    { id: "a", sortOrder: 1 },
    { id: "c", sortOrder: 2 },
  ])
  assert.deepEqual(moveWitness(list, "b", "down"), [
    { id: "a", sortOrder: 0 },
    { id: "c", sortOrder: 1 },
    { id: "b", sortOrder: 2 },
  ])
  assert.equal(moveWitness(list, "a", "up"), null)
  assert.equal(moveWitness(list, "c", "down"), null)
  assert.equal(moveWitness(list, "nincs", "up"), null)
  // mind 0 sortOrder (alapérték): a megadott sorrend számít
  const same = [w("x", true, 0), w("y", true, 0), w("z", true, 0)]
  assert.deepEqual(moveWitness(same, "z", "up"), [
    { id: "x", sortOrder: 0 },
    { id: "z", sortOrder: 1 },
    { id: "y", sortOrder: 2 },
  ])
})
