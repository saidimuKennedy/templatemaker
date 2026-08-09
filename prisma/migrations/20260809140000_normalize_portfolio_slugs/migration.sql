-- Idempotent migration: normalize portfolio slugs to lowercase for tenant isolation.

-- Lowercase slugs that do not conflict with an existing row.
UPDATE "Portfolio"
SET slug = LOWER(slug)
WHERE slug IS NOT NULL
  AND slug <> LOWER(slug)
  AND NOT EXISTS (
    SELECT 1
    FROM "Portfolio" AS conflict
    WHERE conflict.slug = LOWER("Portfolio".slug)
      AND conflict.id <> "Portfolio".id
  );

-- Resolve remaining case-variant duplicates by suffixing the colliding row.
UPDATE "Portfolio" AS p1
SET slug = LOWER(p1.slug) || '-dup-' || SUBSTRING(p1.id, 1, 6)
WHERE p1.slug IS NOT NULL
  AND p1.slug <> LOWER(p1.slug)
  AND EXISTS (
    SELECT 1
    FROM "Portfolio" AS p2
    WHERE p2.slug = LOWER(p1.slug)
      AND p2.id <> p1.id
  );
