"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  user,
  initials,
  signOut,
}: {
  user: { email: string };
  initials: string;
  signOut: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-muted/20 p-2 md:flex",
        collapsed ? "w-16" : "w-72",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && "w-full justify-center",
          )}
        >
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md bg-foreground text-background transition-colors hover:bg-foreground/90",
              collapsed && "mx-auto",
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
          </button>
          {!collapsed && (
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
              aria-label="Portfolio Engine"
            >
              Portfolio Engine
            </Link>
          )}
        </div>
      </div>

      <Separator className="my-2" />

      <nav className="flex flex-col gap-1 text-sm">
        <Link
          href="/dashboard"
          className={cn(
            "flex h-8 items-center rounded-md px-1 py-1 hover:bg-muted",
            collapsed ? "w-full justify-center" : "w-full gap-2 px-2",
          )}
          aria-label="Dashboard"
        >
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="text-xs">Dashboard</span>}
        </Link>
        <Link
          href="/new"
          className={cn(
            "flex h-8 items-center rounded-md px-1 py-1 font-medium hover:bg-muted",
            collapsed ? "w-full justify-center" : "w-full gap-2 px-2",
          )}
          aria-label="Create a new portfolio"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="text-xs">New Portfolio</span>}
        </Link>
      </nav>

      <div className="mt-auto pt-2">
        <Separator className="mb-2" />
        <div
          className={cn(
            "mb-2 flex items-center",
            collapsed ? "justify-center" : "px-1",
          )}
        >
          <ThemeToggle
            className={cn(collapsed ? "h-8 w-8 p-0" : "w-full justify-start px-2")}
            showLabel={!collapsed}
          />
        </div>
        <DropdownMenu>
          {/*
            Explicit id overrides Radix's useId()-derived trigger id (React 19
            computed a different useId path client-side than during SSR), and
            no `asChild` here: Radix renders its own <button> instead of
            cloning ours through Slot, which is where hydration misaligned.
          */}
          <DropdownMenuTrigger
            id="account-menu-trigger"
            className={cn(
              "flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted",
              collapsed && "justify-center px-0",
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && <span className="truncate text-xs">{user.email}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
