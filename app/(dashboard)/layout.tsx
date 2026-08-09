import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/_actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { DashboardSidebar } from "./dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, session } = await getSession();

  if (!user || !session) {
    redirect("/login");
  }

  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar user={user} initials={initials} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-semibold">
            Portfolio Engine
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
