import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { user } = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">Portfolio Generation Engine</span>
          <div className="flex gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Build and publish your portfolio in minutes
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A multi-step wizard, live template preview, and shareable public URLs —
          powered by Next.js, Prisma, and Lucia Auth.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={user ? "/new" : "/signup"}>
              {user ? "Create portfolio" : "Start free"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
