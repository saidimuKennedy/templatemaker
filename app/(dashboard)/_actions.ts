"use server";

import { generateIdFromEntropySize } from "lucia";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultPortfolioData } from "@/lib/schema";
import {
  publishPortfolio,
  unpublishPortfolio,
} from "@/app/(dashboard)/editor/[id]/_actions";

export async function createPortfolioFromForm(formData: FormData) {
  const templateId = formData.get("templateId");
  if (typeof templateId !== "string" || !templateId) {
    redirect("/new");
  }
  await createPortfolio(templateId);
}

export async function createPortfolio(templateId: string) {
  const { user, session } = await getSession();

  if (!user || !session) {
    redirect("/login");
  }

  const id = generateIdFromEntropySize(10);
  const content = defaultPortfolioData();

  await prisma.portfolio.create({
    data: {
      id,
      userId: user.id,
      title: "Untitled Portfolio",
      templateId,
      content,
    },
  });

  redirect(`/editor/${id}`);
}

export async function publishPortfolioFromDashboard(portfolioId: string) {
  await publishPortfolio(portfolioId);
}

export async function unpublishPortfolioFromDashboard(portfolioId: string) {
  await unpublishPortfolio(portfolioId);
}
