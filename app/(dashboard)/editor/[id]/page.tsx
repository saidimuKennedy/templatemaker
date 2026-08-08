import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createDefaultDocument, parseBuilderContent } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { EditorClient } from "@/components/editor/EditorClient";

type EditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const { user, session } = await getSession();

  if (!user || !session) {
    redirect("/login");
  }

  const portfolio = await prisma.portfolio.findUnique({ where: { id } });

  if (!portfolio || portfolio.userId !== user.id) {
    notFound();
  }

  const initialDocument =
    parseBuilderContent(portfolio.content) ??
    createDefaultDocument(portfolio.templateId, portfolio.id);

  return (
    <div className="space-y-4">
      <EditorClient
        portfolioId={portfolio.id}
        initialDocument={initialDocument}
        status={portfolio.status}
        slug={portfolio.slug}
      />
    </div>
  );
}
