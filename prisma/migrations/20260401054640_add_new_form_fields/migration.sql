-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN     "cascoClaimRequest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "driverPhone" TEXT,
ADD COLUMN     "kilometerMark" TEXT,
ADD COLUMN     "outsideSettlement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policeStation" TEXT,
ADD COLUMN     "relevantInsurer" TEXT,
ADD COLUMN     "roadNumber" TEXT,
ADD COLUMN     "vehicleEncumbrance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vehicleInspectionLocation" TEXT;
