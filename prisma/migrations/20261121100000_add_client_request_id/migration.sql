-- Idempotens beküldés: kliens által generált kérés-azonosító (UUID) + a feldolgozás állapota.
-- Kizárólag additív: új, nullable oszlopok + egyedi index. A meglévő sorok NULL-t kapnak
-- (a Postgres egyedi indexe több NULL értéket enged), adat nem módosul vagy törlődik.

-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN "clientRequestId" TEXT,
ADD COLUMN "submissionStartedAt" TIMESTAMP(3),
ADD COLUMN "submitCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_clientRequestId_key" ON "DamageReport"("clientRequestId");
