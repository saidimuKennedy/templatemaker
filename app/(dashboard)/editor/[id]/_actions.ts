"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortfolioDataSchema, parsePortfolioContent } from "@/lib/schema";
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

export async function savePortfolio(portfolioId: string, data: unknown) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);
  const parsed = PortfolioDataSchema.parse(data);

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      content: parsed as object,
      title: parsed.profile.name || portfolio.title,
      updatedAt: new Date(),
    },
  });

  if (portfolio.status === "PUBLISHED" && portfolio.slug) {
    revalidatePath(`/p/${portfolio.slug}`);
  }

  return { success: true };
}

export async function publishPortfolio(portfolioId: string) {
  const { portfolio } = await requireOwnedPortfolio(portfolioId);
  const content = parsePortfolioContent(portfolio.content);
  const slug =
    portfolio.slug ?? (await generateSlug(content.profile.name || portfolio.title));

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      status: "PUBLISHED",
      slug,
      title: content.profile.name || portfolio.title,
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
