import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEMPLATE_REGISTRY } from "@/components/templates";
import { prisma } from "@/lib/db";
import { parsePortfolioContent } from "@/lib/schema";

export const revalidate = false;

type PublicPortfolioPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicPortfolioPageProps): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await prisma.portfolio.findFirst({
    where: { slug, status: "PUBLISHED" },
  });

  if (!portfolio) {
    return { title: "Portfolio not found" };
  }

  const data = parsePortfolioContent(portfolio.content);
  const description = data.profile.bio.slice(0, 160);

  return {
    title: data.profile.name || portfolio.title,
    description: description || undefined,
  };
}

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { slug } = await params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { slug, status: "PUBLISHED" },
  });

  if (!portfolio) {
    notFound();
  }

  const data = parsePortfolioContent(portfolio.content);
  const Template =
    TEMPLATE_REGISTRY[portfolio.templateId] ?? TEMPLATE_REGISTRY.executive;

  return <Template data={data} />;
}
