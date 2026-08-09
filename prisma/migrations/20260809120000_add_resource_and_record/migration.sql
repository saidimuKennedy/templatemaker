-- Idempotent migration: Resource + AppRecord models (Plan 31)

CREATE TABLE IF NOT EXISTS "Resource" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppRecord" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Resource_portfolioId_name_key" ON "Resource"("portfolioId", "name");
CREATE INDEX IF NOT EXISTS "Resource_portfolioId_idx" ON "Resource"("portfolioId");
CREATE INDEX IF NOT EXISTS "AppRecord_resourceId_idx" ON "AppRecord"("resourceId");
CREATE INDEX IF NOT EXISTS "AppRecord_resourceId_createdAt_idx" ON "AppRecord"("resourceId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_portfolioId_fkey'
  ) THEN
    ALTER TABLE "Resource" ADD CONSTRAINT "Resource_portfolioId_fkey"
      FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppRecord_resourceId_fkey'
  ) THEN
    ALTER TABLE "AppRecord" ADD CONSTRAINT "AppRecord_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
