-- AlterTable
-- A 3 önálló Meghatalmazás-PDF (M1 / Autóüveg / Bodrogi Róbert) Supabase Storage URL-jeit
-- tárolja, LegalEntity.key szerinti kulcsokkal ({ m1, autouveg, bodrogi }). Lásd lib/finalize.ts.
ALTER TABLE "DamageReport" ADD COLUMN "authorizationPdfUrls" JSONB;
