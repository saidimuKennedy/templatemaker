"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOpenAICompatibleProvider } from "@/builder/ai/openai-compatible-provider";
import type { AIProvider } from "@/builder/ai/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { publish as publishDocument } from "@/builder/publish/publish";
import { deserializeDocument } from "@/builder/document/serialize";
import type { BuilderDocument, ValidationError } from "@/builder/document/types";
import type { Command } from "@/builder/history/types";
import { getSession } from "@/lib/auth";
import {
  createPortfolioRegistry,
  getProfileHeaderName,
  normalizePagePath,
  parseBuilderContent,
  validatePortfolioDocument,
} from "@/lib/builder";
import { AI_RATE_LIMITS, checkAIRateLimit, recordAIRequest } from "@/lib/ai/rate-limit";
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

type ResolvedProvider =
  | { ok: true; provider: AIProvider }
  | { ok: false; error: string };

/**
 * Builds the AI provider from configuration alone.
 *
 * Vendor choice is three environment variables, not a code path: point
 * `AI_BASE_URL` at any OpenAI-compatible endpoint (DeepSeek, Groq,
 * Together, Fireworks, OpenRouter, Mistral, or a local vLLM/Ollama) and
 * nothing here changes. That is the point — ADR-005 asks for vendor
 * neutrality, and an interface alone only delivers it at the code level,
 * where adding a vendor still means writing an adapter.
 *
 * Reporting all three missing names at once is deliberate: configuring
 * this wrong is the single likeliest failure, and discovering the
 * variables one round-trip at a time is miserable.
 */
function resolveAIProvider(registry: ComponentRegistry): ResolvedProvider {
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const modelId = process.env.AI_MODEL;

  const missing = [
    !baseURL && "AI_BASE_URL",
    !apiKey && "AI_API_KEY",
    !modelId && "AI_MODEL",
  ].filter((entry): entry is string => Boolean(entry));

  if (missing.length > 0) {
    return {
      ok: false,
      error: `AI generation is not configured. Missing: ${missing.join(", ")}. See .env.example.`,
    };
  }

  return {
    ok: true,
    provider: createOpenAICompatibleProvider({
      baseURL: baseURL!,
      apiKey: apiKey!,
      modelId: modelId!,
      registry,
      name: process.env.AI_PROVIDER_NAME || "openai-compatible",
    }),
  };
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

type GenerateFromPromptResult =
  | { success: true; commands: readonly Command[] }
  | { success: false; error: string };

export async function generateFromPrompt(
  portfolioId: string,
  prompt: string,
  documentJson: string,
): Promise<GenerateFromPromptResult> {
  const { user } = await requireOwnedPortfolio(portfolioId);

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return { success: false, error: "Prompt cannot be empty." };
  }
  if (trimmed.length > AI_RATE_LIMITS.maxPromptLength) {
    return {
      success: false,
      error: `Prompt exceeds ${AI_RATE_LIMITS.maxPromptLength} characters.`,
    };
  }

  const rateLimit = checkAIRateLimit(user.id);
  if (!rateLimit.allowed) {
    const retryMinutes = Math.ceil(rateLimit.retryAfterMs / 60_000);
    const message =
      rateLimit.reason === "interval"
        ? `Please wait ${Math.ceil(rateLimit.retryAfterMs / 1000)} seconds before generating again.`
        : `Rate limit reached (${AI_RATE_LIMITS.maxRequestsPerHour}/hour). Try again in ~${retryMinutes} minute(s).`;
    return { success: false, error: message };
  }

  const registry = createPortfolioRegistry();
  const resolved = resolveAIProvider(registry);
  if (!resolved.ok) {
    recordAIRequest(user.id);
    return { success: false, error: resolved.error };
  }

  let document: BuilderDocument;
  try {
    document = deserializeDocument(documentJson);
  } catch {
    return { success: false, error: "Document could not be parsed." };
  }

  const provider = resolved.provider;

  try {
    const result = await provider.generate({ prompt: trimmed, document });
    recordAIRequest(user.id);
    return { success: true, commands: result.commands };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI generation failed.",
    };
  }
}
