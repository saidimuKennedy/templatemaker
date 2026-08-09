import type { Portfolio } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

/** Canonical slug form — lowercase, used for storage and tenant isolation. */
export function normalizePortfolioSlug(slug: string): string {
  return slug.toLowerCase();
}

export async function findPublishedPortfolioBySlug(
  slug: string,
): Promise<Portfolio | null> {
  const normalized = normalizePortfolioSlug(slug);
  const portfolio = await prisma.portfolio.findUnique({
    where: { slug: normalized },
  });

  if (!portfolio || portfolio.status !== "PUBLISHED") {
    return null;
  }

  return portfolio;
}

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "portfolio";
}

export async function generateSlug(name: string): Promise<string> {
  const base = slugifyName(name);

  for (let attempt = 0; attempt < 2; attempt++) {
    // Normalize BEFORE the collision check. nanoid's alphabet is mixed case,
    // so checking the raw value queries a key space that is never stored:
    // `foo-AbC123` and `foo-abc123` both pass, then collide on insert against
    // the unique index. Case-folding is exactly what makes that collision
    // possible, so the check has to run on the folded form.
    const slug = normalizePortfolioSlug(`${base}-${nanoid(6)}`);
    const existing = await prisma.portfolio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return normalizePortfolioSlug(`${base}-${nanoid(10)}`);
}
