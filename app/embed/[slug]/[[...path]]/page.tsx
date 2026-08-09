import { notFound } from "next/navigation";
import {
  createPortfolioRegistry,
  parseBuilderContent,
  readPublishedStyleNonce,
  renderEmbedded,
  resolvePageByPath,
  validatePortfolioDocument,
} from "@/lib/builder";
import { prisma } from "@/lib/db";

export const revalidate = false;

type EmbedPageProps = {
  params: Promise<{ slug: string; path?: string[] }>;
};

export default async function EmbedPortfolioPage({ params }: EmbedPageProps) {
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

  const validation = validatePortfolioDocument(document, registry);
  if (!validation.valid) {
    notFound();
  }

  return renderEmbedded(document, registry, path, "/embed", styleNonce);
}
