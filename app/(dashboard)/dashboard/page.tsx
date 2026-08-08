import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortfolioCard } from "./portfolio-card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const { user, session } = await getSession();

  if (!user || !session) {
    redirect("/login");
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage and publish your portfolios
          </p>
        </div>
        <Button asChild>
          <Link href="/new">+ New Portfolio</Link>
        </Button>
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-lg font-medium">No portfolios yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first portfolio with the wizard and publish it to a public URL.
          </p>
          <Button asChild className="mt-6">
            <Link href="/new">Create portfolio</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} />
          ))}
        </div>
      )}
    </div>
  );
}
