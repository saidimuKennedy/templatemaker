import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createPortfolioRegistry,
  getProfileHeaderBio,
  getProfileHeaderName,
  parseBuilderContent,
  readPublishedStyleNonce,
  renderPublished,
  resolvePageByPath,
} from "@/lib/builder";
import { buildPublishedSiteUrl } from "@/lib/hosts";
import { prisma } from "@/lib/db";

export const revalidate = false;

type PublicPortfolioPageProps = {
  params: Promise<{ slug: string; path?: string[] }>;
};

export async function generateMetadata({
  params,
}: PublicPortfolioPageProps): Promise<Metadata> {
  const { slug, path } = await params;
  const portfolio = await prisma.portfolio.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, status: "PUBLISHED" },
  });

  if (!portfolio) {
    return { title: "Portfolio not found" };
  }

  const document = parseBuilderContent(portfolio.content);
  if (!document) {
    return { title: portfolio.title };
  }

  const page = resolvePageByPath(document, path);
  if (!page) {
    return { title: "Page not found" };
  }

  const name = getProfileHeaderName(document) || portfolio.title;
  const bio = getProfileHeaderBio(document);
  const description = bio.slice(0, 160);
  const pagePath = path?.length ? `/${path.join("/")}` : "";

  return {
    title: path?.length ? `${page.name} · ${name}` : name,
    description: description || undefined,
    alternates: {
      canonical: buildPublishedSiteUrl(slug, pagePath),
    },
  };
}

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { slug, path } = await params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, status: "PUBLISHED" },
  });

  if (!portfolio) {
    notFound();
  }

  const document = parseBuilderContent(portfolio.content);
  if (!document) {
    notFound();
  }

  const page = resolvePageByPath(document, path);
  if (!page) {
    notFound();
  }

  const registry = createPortfolioRegistry();
  const styleNonce = await readPublishedStyleNonce();

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        // Explicit, not `bg-background`/`text-foreground`. Those are platform
        // tokens that flip with the visitor's `prefers-color-scheme`, which
        // repainted published portfolios to the visitor's OS theme and left
        // author text unreadable against author-set surfaces (Plan 30).
        // A published page is the author's canvas; the visitor's preferences
        // do not get a vote.
        background: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      {/*
        Fluid, not fixed: the document is authored mobile-first and its sm/md/lg
        overrides ship as real @media rules, so the container must be allowed to
        grow with the viewport. Capping this at a phone width made every visitor
        see the mobile layout while the desktop media queries still fired,
        which overflowed the page horizontally.
      */}
      <div className="mx-auto w-full max-w-[1200px]">
        {renderPublished(document, registry, path, undefined, styleNonce)}
      </div>
    </div>
  );
}
