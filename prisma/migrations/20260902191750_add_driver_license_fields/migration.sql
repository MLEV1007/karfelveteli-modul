-- AlterTable
-- Vezető adatai (1. lépés) kiegészítve: születési idő, vezetői engedély száma és
-- érvényességi ideje. Korábban csak név/cím/telefon volt tárolva.
ALTER TABLE "DamageReport"
  ADD COLUMN "driverBirthDate" TIMESTAMP(3),
  ADD COLUMN "driverLicenseNumber" TEXT,
  ADD COLUMN "driverLicenseValidUntil" TIMESTAMP(3);
