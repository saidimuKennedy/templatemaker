import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/_actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/auth";

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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-muted/20 p-4 md:flex">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Portfolio Engine
        </Link>
        <Separator className="my-4" />
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 hover:bg-muted"
          >
            Dashboard
          </Link>
          <Link
            href="/new"
            className="rounded-md px-3 py-2 font-medium hover:bg-muted"
          >
            + New Portfolio
          </Link>
        </nav>
        <div className="mt-auto pt-4">
          <Separator className="mb-4" />
          <DropdownMenu>
            {/*
              Explicit id overrides Radix's useId()-derived trigger id (React 19
              computed a different useId path client-side than during SSR), and
              no `asChild` here: Radix renders its own <button> instead of
              cloning ours through Slot, which is where hydration misaligned.
            */}
            <DropdownMenuTrigger
              id="account-menu-trigger"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs">{user.email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <form action={signOut}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-semibold">
            Portfolio Engine
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
