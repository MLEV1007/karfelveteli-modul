-- CreateSequence: atomikus, race condition mentes sorszám-forrás a "BIZTxxxx" azonosítókhoz
CREATE SEQUENCE IF NOT EXISTS "DamageReport_referenceNumber_seq" START 1;

-- AlterTable: előbb nullable oszlopként vesszük fel, hogy a meglévő sorokat fel tudjuk tölteni
ALTER TABLE "DamageReport" ADD COLUMN "referenceNumber" TEXT;

-- Backfill: a meglévő rekordok létrehozás sorrendjében kapják meg a BIZT0001, BIZT0002, ... azonosítót
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT "id" FROM "DamageReport" ORDER BY "createdAt" ASC, "id" ASC LOOP
    UPDATE "DamageReport"
    SET "referenceNumber" = 'BIZT' || lpad(nextval('"DamageReport_referenceNumber_seq"')::text, 4, '0')
    WHERE "id" = r."id";
  END LOOP;
END $$;

-- Minden sor kapott értéket, most már kikényszeríthető a NOT NULL
ALTER TABLE "DamageReport" ALTER COLUMN "referenceNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_referenceNumber_key" ON "DamageReport"("referenceNumber");
