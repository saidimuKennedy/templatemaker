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
      {/*
        Fluid, not fixed: the document is authored mobile-first and its sm/md/lg
        overrides ship as real @media rules, so the container must be allowed to
        grow with the viewport. Capping this at a phone width made every visitor
        see the mobile layout while the desktop media queries still fired,
        which overflowed the page horizontally.
      */}
      <div className="mx-auto w-full max-w-[1200px]">
        {renderPublished(document, registry)}
      </div>
    </div>
  );
}
