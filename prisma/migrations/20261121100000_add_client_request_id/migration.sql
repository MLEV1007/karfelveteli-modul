-- Idempotens beküldés: kliens által generált kérés-azonosító (UUID).
-- Kizárólag additív: új, nullable oszlop + egyedi index. A meglévő sorok NULL-t kapnak
-- (a Postgres egyedi indexe több NULL értéket enged), adat nem módosul vagy törlődik.

-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_clientRequestId_key" ON "DamageReport"("clientRequestId");
