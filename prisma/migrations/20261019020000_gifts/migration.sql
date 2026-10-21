-- Additive gift catalogue. Existing weddings, publications and photographs are retained.
ALTER TABLE "Publication" ADD COLUMN "gifts" JSONB;

CREATE TABLE "GiftImage" (
  "id" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftImage_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880),
  CONSTRAINT "GiftImage_mime_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp'))
);
CREATE UNIQUE INDEX "GiftImage_storageKey_key" ON "GiftImage"("storageKey");
CREATE UNIQUE INDEX "GiftImage_id_weddingId_key" ON "GiftImage"("id", "weddingId");
CREATE INDEX "GiftImage_weddingId_idx" ON "GiftImage"("weddingId");
ALTER TABLE "GiftImage" ADD CONSTRAINT "GiftImage_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GiftItem" (
  "id" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "valueCents" INTEGER,
  "imageId" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftItem_value_check" CHECK ("valueCents" IS NULL OR "valueCents" BETWEEN 1 AND 100000000),
  CONSTRAINT "GiftItem_position_check" CHECK ("position" BETWEEN 0 AND 1000000)
);
CREATE UNIQUE INDEX "GiftItem_id_weddingId_key" ON "GiftItem"("id", "weddingId");
CREATE INDEX "GiftItem_weddingId_archivedAt_position_idx" ON "GiftItem"("weddingId", "archivedAt", "position");
ALTER TABLE "GiftItem" ADD CONSTRAINT "GiftItem_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftItem" ADD CONSTRAINT "GiftItem_imageId_weddingId_fkey" FOREIGN KEY ("imageId", "weddingId") REFERENCES "GiftImage"("id", "weddingId") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "GiftAudit" (
  "id" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GiftAudit_weddingId_giftId_createdAt_idx" ON "GiftAudit"("weddingId", "giftId", "createdAt");
ALTER TABLE "GiftAudit" ADD CONSTRAINT "GiftAudit_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftAudit" ADD CONSTRAINT "GiftAudit_giftId_weddingId_fkey" FOREIGN KEY ("giftId", "weddingId") REFERENCES "GiftItem"("id", "weddingId") ON DELETE RESTRICT ON UPDATE CASCADE;
