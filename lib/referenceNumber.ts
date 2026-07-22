import { prisma } from "./db"

// Atomikus, race condition mentes sorszám-forrás (lásd a "DamageReport_referenceNumber_seq"
// Postgres sequence-t az add_reference_number migrációban) — minden hívás garantáltan
// egyedi, monoton növekvő értéket ad vissza egyidejű beküldések esetén is.
export async function nextReferenceNumber(): Promise<string> {
  const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('"DamageReport_referenceNumber_seq"') AS nextval
  `
  return `BIZT${nextval.toString().padStart(4, "0")}`
}
