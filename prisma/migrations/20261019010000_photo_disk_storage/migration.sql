-- Preserve existing BYTEA photos until they have been safely migrated to disk.
-- New uploads never populate bytes. The application can migrate legacy rows on access.
ALTER TABLE "Photo" ALTER COLUMN "bytes" DROP NOT NULL;
ALTER TABLE "Photo" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "Photo" ADD COLUMN "sizeBytes" INTEGER;
CREATE UNIQUE INDEX "Photo_storageKey_key" ON "Photo"("storageKey");
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_storage_present_check"
  CHECK (("bytes" IS NOT NULL) OR ("storageKey" IS NOT NULL AND "sizeBytes" IS NOT NULL));
