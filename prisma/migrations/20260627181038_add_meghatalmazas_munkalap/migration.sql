-- CreateEnum
CREATE TYPE "InsuranceCompany" AS ENUM ('ALLIANZ', 'GENERALI', 'GROUPAMA', 'UNIQA', 'KH_BIZTOSITO', 'UNION', 'SIGNAL_IDUNA', 'WABERERS', 'GENERTEL', 'MAGYAR_POSTA_BIZTOSITO', 'EGYEB');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('WINDSHIELD_REPLACE', 'WINDSHIELD_REPAIR', 'SIDE_GLASS', 'REAR_GLASS');

-- CreateEnum
CREATE TYPE "MaterialUsed" AS ENUM ('GLUE', 'FRAME', 'SENSOR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'INSURANCE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING_TECHNICIAN', 'COMPLETED', 'FAILED_PDF');

-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN     "accept8DayPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "damageNotes" TEXT,
ADD COLUMN     "eurocode" TEXT,
ADD COLUMN     "finalPdfUrl" TEXT,
ADD COLUMN     "idOrTaxNumber" TEXT,
ADD COLUMN     "insuranceCompany" "InsuranceCompany",
ADD COLUMN     "knowsCascoTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "laborCost" INTEGER,
ADD COLUMN     "materialCost" INTEGER,
ADD COLUMN     "materialsUsed" "MaterialUsed"[],
ADD COLUMN     "mileage" INTEGER,
ADD COLUMN     "munkalapClosedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "pdfErrorMessage" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING_TECHNICIAN',
ADD COLUMN     "technicianName" TEXT,
ADD COLUMN     "technicianSignatureUrl" TEXT,
ADD COLUMN     "technicianToken" TEXT,
ADD COLUMN     "technicianTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "vehicleCheckIn" TIMESTAMP(3),
ADD COLUMN     "vehicleCheckOut" TIMESTAMP(3),
ADD COLUMN     "workType" "WorkType"[];

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_technicianToken_key" ON "DamageReport"("technicianToken");

