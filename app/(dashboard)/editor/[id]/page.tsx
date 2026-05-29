import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePortfolioContent } from "@/lib/schema";
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

  const content = parsePortfolioContent(portfolio.content);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Template: <span className="capitalize">{portfolio.templateId}</span>
        </p>
      </div>
      <EditorClient
        portfolioId={portfolio.id}
        templateId={portfolio.templateId}
        initialData={content}
        status={portfolio.status}
      />
    </div>
  );
}
