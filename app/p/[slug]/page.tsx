import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createPortfolioRegistry,
  getProfileHeaderBio,
  getProfileHeaderName,
  parseBuilderContent,
  renderPublished,
} from "@/lib/builder";
import { prisma } from "@/lib/db";

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

  const document = parseBuilderContent(portfolio.content);
  if (!document) {
    return { title: portfolio.title };
  }

  const name = getProfileHeaderName(document) || portfolio.title;
  const bio = getProfileHeaderBio(document);
  const description = bio.slice(0, 160);

  return {
    title: name,
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

  const document = parseBuilderContent(portfolio.content);
  if (!document) {
    notFound();
  }

  const registry = createPortfolioRegistry();

  return (
    <div
      className="min-h-screen bg-background px-4 py-8 text-foreground"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-[390px]">{renderPublished(document, registry)}</div>
    </div>
  );
}
