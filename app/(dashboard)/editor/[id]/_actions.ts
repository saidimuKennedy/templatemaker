"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publish as publishDocument } from "@/builder/publish/publish";
import { deserializeDocument } from "@/builder/document/serialize";
import type { BuilderDocument, ValidationError } from "@/builder/document/types";
import { getSession } from "@/lib/auth";
import {
  createPortfolioRegistry,
  getProfileHeaderName,
  normalizePagePath,
  parseBuilderContent,
  validatePortfolioDocument,
} from "@/lib/builder";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";

/**
 * Invalidates every public URL that renders a portfolio's content.
 *
 * Two things make this easy to get wrong, and both have already bitten:
 *
 * 1. There are **two** public routes — `/p/[slug]/[[...path]]` and
 *    `/embed/[slug]/[[...path]]` — and both set
 *    `export const revalidate = false`, so anything not explicitly
 *    revalidated is cached indefinitely. Only `/p` was invalidated at
 *    first, so embedded portfolios froze at whatever they rendered on
 *    the very first request.
 * 2. Since pages became routable, **every page is its own cache entry.**
 *    `revalidatePath` takes a literal path; it does not invalidate
 *    children. Revalidating only `/p/{slug}` would refresh the index and
 *    leave `/p/{slug}/about` stale forever.
 *
 * So iterate the document's own pages rather than assuming one URL per
 * portfolio, and reuse `normalizePagePath` — the same function the route
 * resolver matches against — so these paths can't drift from the ones
 * actually served.
 *
 * The whole-route form (`revalidatePath('/p/[slug]/[[...path]]', 'page')`)
 * would also work but invalidates *every* portfolio's cache on every
 * autosave, which fires every two seconds while editing.
 *
 * Both routes are handled here rather than at each call site so adding a
 * third public route is one edit and not a hunt.
 */
function revalidatePublicRoutes(slug: string, document?: BuilderDocument): void {
  const paths = new Set(
    (document?.pages ?? []).map((page) => normalizePagePath(page.path)),
  );
  // Always include the index: it is what an unknown/removed path falls
  // back to, and it is the only URL a portfolio without a parseable
  // document is reachable at.
  paths.add("/");

  for (const path of paths) {
    const suffix = path === "/" ? "" : path;
    revalidatePath(`/p/${slug}${suffix}`);
    revalidatePath(`/embed/${slug}${suffix}`);
  }
}

async function requireOwnedPortfolio(portfolioId: string) {
  const { user, session } = await getSession();

  if (!user || !session) {
    redirect("/login");
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
  });

  if (!portfolio || portfolio.userId !== user.id) {
    redirect("/login");
  }

  return { user, portfolio };
}

type SaveDocumentResult =
  | { success: true }
  | { success: false; errors: readonly ValidationError[] };

export async function saveDocument(
  portfolioId: string,
  documentJson: string,
): Promise<SaveDocumentResult> {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);
  const document = deserializeDocument(documentJson);
  const registry = createPortfolioRegistry();
  const validation = validatePortfolioDocument(document, registry);

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const displayName = getProfileHeaderName(document) || portfolio.title;

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      content: JSON.parse(documentJson) as object,
      title: displayName,
      updatedAt: new Date(),
    },
  });

  if (portfolio.status === "PUBLISHED" && portfolio.slug) {
    revalidatePublicRoutes(portfolio.slug, document);
  }

  return { success: true };
}

type PublishPortfolioResult = {
  success: boolean;
  slug?: string | null;
  error?: string;
  errors?: readonly ValidationError[];
};

export async function publishPortfolio(portfolioId: string): Promise<PublishPortfolioResult> {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);
  const document = parseBuilderContent(portfolio.content);

  if (!document) {
    return {
      success: false,
      error: "Portfolio content could not be parsed. Save your work and try again.",
    };
  }

  const registry = createPortfolioRegistry();
  const outcome = publishDocument(document, registry);

  if (!outcome.ok) {
    return { success: false, errors: outcome.errors };
  }

  const displayName = getProfileHeaderName(document) || portfolio.title;
  const slug = portfolio.slug ?? (await generateSlug(displayName));

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      status: "PUBLISHED",
      slug,
      title: displayName,
    },
  });

  revalidatePublicRoutes(slug, document);
  return { success: true, slug };
}

export async function unpublishPortfolio(portfolioId: string) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { status: "UNPUBLISHED" },
  });

  if (portfolio.slug) {
    // Unpublishing must clear every page's cache, not just the index, or
    // subpages keep serving content for a portfolio that is no longer
    // public. The document is the only record of which paths existed.
    revalidatePublicRoutes(portfolio.slug, parseBuilderContent(portfolio.content));
  }

  return { success: true };
}

export async function deletePortfolio(portfolioId: string) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);

  if (portfolio.slug) {
    // Read the page paths before the row is deleted — afterwards there is
    // nothing left to tell us which URLs to invalidate.
    revalidatePublicRoutes(portfolio.slug, parseBuilderContent(portfolio.content));
  }

  await prisma.portfolio.delete({ where: { id: portfolioId } });
  redirect("/dashboard");
}
