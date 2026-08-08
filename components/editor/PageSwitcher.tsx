"use client";

import { useState } from "react";
import { generateNodeId, generatePageId } from "@/builder/document/id";
import type { BuilderPage, PageId } from "@/builder/document/types";
import type { Command } from "@/builder/history/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, FilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PageSwitcherProps = {
  readonly pages: readonly BuilderPage[];
  readonly currentPageId: PageId;
  readonly onSelectPage: (pageId: PageId) => void;
  readonly onCommand: (command: Command) => void;
  readonly onNotify: (message: { title: string; description?: string }) => void;
};

function createBlankPage(name: string, path: string): BuilderPage {
  return {
    id: generatePageId(),
    name,
    path,
    root: {
      id: generateNodeId(),
      type: "Page",
      props: {},
      styles: {},
      children: [],
    },
  };
}

function suggestPath(name: string, pages: readonly BuilderPage[]): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    return `/page-${pages.length + 1}`;
  }
  let candidate = `/${slug}`;
  let suffix = 2;
  const normalized = (path: string) => (path === "" || path === "/" ? "/" : path);
  while (pages.some((page) => normalized(page.path) === normalized(candidate))) {
    candidate = `/${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function PageSwitcher({
  pages,
  currentPageId,
  onSelectPage,
  onCommand,
  onNotify,
}: PageSwitcherProps) {
  const [renamingPageId, setRenamingPageId] = useState<PageId | null>(null);
  const [draftName, setDraftName] = useState("");

  const currentPage = pages.find((page) => page.id === currentPageId);

  const handleAddPage = () => {
    const name = `Page ${pages.length + 1}`;
    const page = createBlankPage(name, suggestPath(name, pages));
    onCommand({ type: "CreatePage", payload: { page } });
    onSelectPage(page.id);
  };

  const handleDeletePage = (pageId: PageId) => {
    if (pages.length <= 1) {
      onNotify({
        title: "Cannot delete page",
        description: "A portfolio must have at least one page.",
      });
      return;
    }
    onCommand({ type: "DeletePage", payload: { pageId } });
    if (pageId === currentPageId) {
      const remaining = pages.find((page) => page.id !== pageId);
      if (remaining) {
        onSelectPage(remaining.id);
      }
    }
  };

  const startRename = (page: BuilderPage) => {
    setRenamingPageId(page.id);
    setDraftName(page.name);
  };

  const commitRename = (pageId: PageId) => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setRenamingPageId(null);
      return;
    }
    onCommand({ type: "UpdatePage", payload: { pageId, name: trimmed } });
    setRenamingPageId(null);
  };

  const movePage = (pageId: PageId, direction: "up" | "down") => {
    const index = pages.findIndex((page) => page.id === pageId);
    if (index === -1) {
      return;
    }
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) {
      return;
    }
    onCommand({ type: "ReorderPage", payload: { pageId, newIndex } });
  };

  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 min-w-0 justify-between px-2 text-xs font-medium"
          >
            <span className="truncate">{currentPage?.name ?? "Page"}</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {pages.map((page) => (
            <DropdownMenuItem
              key={page.id}
              className={cn(page.id === currentPageId && "bg-accent")}
              onSelect={() => onSelectPage(page.id)}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{page.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">{page.path}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleAddPage}>
            <FilePlus className="mr-2 h-4 w-4" />
            Add page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0"
        aria-label="Add page"
        onClick={handleAddPage}
      >
        <FilePlus className="h-3.5 w-3.5" />
      </Button>

      {currentPage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              aria-label="Page actions"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {renamingPageId === currentPage.id ? (
              <div className="space-y-2 p-2">
                <Input
                  value={draftName}
                  autoFocus
                  className="h-8 text-xs"
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") {
                      commitRename(currentPage.id);
                    } else if (event.key === "Escape") {
                      setRenamingPageId(null);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => commitRename(currentPage.id)}
                >
                  Save name
                </Button>
              </div>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => startRename(currentPage)}>
                  Rename page
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={pages.findIndex((page) => page.id === currentPage.id) === 0}
                  onSelect={() => movePage(currentPage.id, "up")}
                >
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    pages.findIndex((page) => page.id === currentPage.id) === pages.length - 1
                  }
                  onSelect={() => movePage(currentPage.id, "down")}
                >
                  Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={pages.length <= 1}
                  className="text-destructive focus:text-destructive"
                  onSelect={() => handleDeletePage(currentPage.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete page
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
