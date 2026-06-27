-- AlterTable
ALTER TABLE "DamageReport" DROP COLUMN "eurocode",
DROP COLUMN "laborCost",
DROP COLUMN "materialCost",
DROP COLUMN "materialsUsed",
DROP COLUMN "mileage",
DROP COLUMN "paymentMethod",
DROP COLUMN "workType",
ADD COLUMN     "equipmentChecklist" JSONB;

-- DropEnum
DROP TYPE "MaterialUsed";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "WorkType";

