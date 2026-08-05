"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { publish as publishDocument } from "@/builder/publish/publish";
import { deserializeDocument } from "@/builder/document/serialize";
import type { ValidationError } from "@/builder/document/types";
import { getSession } from "@/lib/auth";
import {
  createPortfolioRegistry,
  getProfileHeaderName,
  parseBuilderContent,
  validatePortfolioDocument,
} from "@/lib/builder";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";

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
    revalidatePath(`/p/${portfolio.slug}`);
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

  revalidatePath(`/p/${slug}`);
  return { success: true, slug };
}

export async function unpublishPortfolio(portfolioId: string) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { status: "UNPUBLISHED" },
  });

  if (portfolio.slug) {
    revalidatePath(`/p/${portfolio.slug}`);
  }

  return { success: true };
}

export async function deletePortfolio(portfolioId: string) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);

  if (portfolio.slug) {
    revalidatePath(`/p/${portfolio.slug}`);
  }

  await prisma.portfolio.delete({ where: { id: portfolioId } });
  redirect("/dashboard");
}
