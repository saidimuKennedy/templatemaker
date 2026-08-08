import { notFound } from "next/navigation";
import {
  createPortfolioRegistry,
  parseBuilderContent,
  renderEmbedded,
  validatePortfolioDocument,
} from "@/lib/builder";
import { prisma } from "@/lib/db";

export const revalidate = false;

type EmbedPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EmbedPortfolioPage({ params }: EmbedPageProps) {
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

  // A published document failing validation here means the data itself
  // is broken, not a normal "not found" case — surface it rather than
  // silently 404ing, since /p/[slug] already confirmed this exact
  // document renders when it was published.
  const validation = validatePortfolioDocument(document, registry);
  if (!validation.valid) {
    notFound();
  }

  // No page chrome: an embed is dropped into someone else's layout via
  // iframe, so it must not impose min-h-screen, padding, or a max-width
  // cap the way /p/[slug] does.
  return renderEmbedded(document, registry);
}
