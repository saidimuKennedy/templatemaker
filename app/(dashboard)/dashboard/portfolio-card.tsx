"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import type { Portfolio, PortfolioStatus } from "@prisma/client";
import {
  publishPortfolioFromDashboard,
  unpublishPortfolioFromDashboard,
} from "@/app/(dashboard)/_actions";
import { deletePortfolio } from "@/app/(dashboard)/editor/[id]/_actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

type PortfolioCardProps = {
  portfolio: Portfolio;
};

function statusVariant(status: PortfolioStatus): "draft" | "published" | "unpublished" {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "UNPUBLISHED":
      return "unpublished";
    default:
      return "draft";
  }
}

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const runAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <>
      <article className="flex flex-col rounded-lg border border-border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-medium">{portfolio.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {formatDate(portfolio.updatedAt)}
            </p>
          </div>
          <DropdownMenu>
            {/* Stable id (see app/(dashboard)/layout.tsx) — avoids Radix useId hydration mismatch. */}
            <DropdownMenuTrigger asChild id={`portfolio-actions-${portfolio.id}`}>
              <Button variant="ghost" size="sm" disabled={pending} aria-label="Actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/editor/${portfolio.id}`}>Edit</Link>
              </DropdownMenuItem>
              {portfolio.status !== "PUBLISHED" ? (
                <DropdownMenuItem
                  onSelect={() =>
                    runAction(() => publishPortfolioFromDashboard(portfolio.id))
                  }
                >
                  Publish
                </DropdownMenuItem>
              ) : null}
              {portfolio.status === "PUBLISHED" ? (
                <DropdownMenuItem
                  onSelect={() =>
                    runAction(() => unpublishPortfolioFromDashboard(portfolio.id))
                  }
                >
                  Unpublish
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onSelect={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge variant={statusVariant(portfolio.status)}>
            {portfolio.status.toLowerCase()}
          </Badge>
          {portfolio.slug && portfolio.status === "PUBLISHED" ? (
            <Link
              href={`/p/${portfolio.slug}`}
              className="text-xs text-muted-foreground hover:underline"
              target="_blank"
            >
              View live
            </Link>
          ) : null}
        </div>
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete portfolio?</DialogTitle>
            <DialogDescription>
              This permanently removes &quot;{portfolio.title}&quot;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deletePortfolio(portfolio.id);
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
