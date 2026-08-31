-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('SZEMELYGEPKOCSI', 'TEHERGEPKOCSI');

-- CreateEnum
CREATE TYPE "WorkProcess" AS ENUM ('CSERE', 'JAVITAS');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('MEGBONTATLAN', 'MOZGASKEPES');

-- AlterTable
-- Jármű alapadatok (2. lépés, ügyfél tölti ki) + a Jegyzőkönyv 3 kizárólagos-választós
-- mezőcsoportja (jármű kategória / munkafolyamat / állapot — technikus tölti ki lezáráskor).
-- Lásd karfelveteli_modul/terv-uj-fejlesztesek-2026-08.md, 2. szakasz.
ALTER TABLE "DamageReport"
  ADD COLUMN "vehicleRegistrationDate" TIMESTAMP(3),
  ADD COLUMN "vehicleInspectionValidUntil" TIMESTAMP(3),
  ADD COLUMN "vehicleEngineCapacity" INTEGER,
  ADD COLUMN "vehiclePowerKw" INTEGER,
  ADD COLUMN "vehicleColor" TEXT,
  ADD COLUMN "vehicleCategory" "VehicleCategory",
  ADD COLUMN "workProcess" "WorkProcess",
  ADD COLUMN "vehicleCondition" "VehicleCondition";
