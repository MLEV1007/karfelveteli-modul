-- Ügyfél-visszajelzés (2026-09), lásd terv-ugyfel-visszajelzes-2026-09.md
-- Minden új mező nem kötelező vagy alapértékkel rendelkezik, így a korábbi kárügyek
-- és a rájuk épülő PDF-újragenerálás változatlanul működik.

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('SZELVEDO_JAVITAS', 'SZELVEDO_CSERE', 'EGYEB');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('MAGANSZEMELY', 'CEG');

-- AlterTable
ALTER TABLE "DamageReport"
  ADD COLUMN "driverSameAsOwner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "damageType" "DamageType",
  ADD COLUMN "ownerType" "OwnerType",
  ADD COLUMN "selectedAuthorizations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
