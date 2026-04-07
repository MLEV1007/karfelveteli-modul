/*
  Warnings:

  - A unique constraint covering the columns `[editToken]` on the table `DamageReport` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN     "editToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_editToken_key" ON "DamageReport"("editToken");
