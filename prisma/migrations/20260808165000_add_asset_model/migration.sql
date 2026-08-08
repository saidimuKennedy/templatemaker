-- Idempotent migration: Asset model for per-user upload library (Plan 25 Stage 5e)

CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Asset_userId_idx" ON "Asset"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_provider_providerId_key" ON "Asset"("provider", "providerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Asset_userId_fkey'
  ) THEN
    ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
