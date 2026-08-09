"use client";

import { useState } from "react";
import { generateNodeId, generatePageId } from "@/builder/document/id";
import type { BuilderPage, PageId } from "@/builder/document/types";
import { cloneNodeWithNewIds } from "@/builder/canvas/duplicate";
import type { Command } from "@/builder/history/types";
import { suggestPath } from "@/builder/pages/suggest-path";
import { PageSettingsDialog } from "@/components/editor/PageSettingsDialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, FilePlus, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PageSwitcherProps = {
  readonly pages: readonly BuilderPage[];
  readonly currentPageId: PageId;
  readonly isPublished: boolean;
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

function duplicatePage(page: BuilderPage, pages: readonly BuilderPage[]): BuilderPage {
  const name = `${page.name} Copy`;
  return {
    id: generatePageId(),
    name,
    path: suggestPath(name, pages),
    root: cloneNodeWithNewIds(page.root),
  };
}

export function PageSwitcher({
  pages,
  currentPageId,
  isPublished,
  onSelectPage,
  onCommand,
  onNotify,
}: PageSwitcherProps) {
  const [settingsPageId, setSettingsPageId] = useState<PageId | null>(null);

  const currentPage = pages.find((page) => page.id === currentPageId);
  const settingsPage = pages.find((page) => page.id === settingsPageId) ?? null;

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

  const handleDuplicatePage = (page: BuilderPage) => {
    const copy = duplicatePage(page, pages);
    onCommand({ type: "CreatePage", payload: { page: copy } });
    onSelectPage(copy.id);
  };

  const handleSaveSettings = (payload: { name: string; path: string }) => {
    if (!settingsPageId) {
      return;
    }
    onCommand({
      type: "UpdatePage",
      payload: {
        pageId: settingsPageId,
        name: payload.name,
        path: payload.path,
      },
    });
  };

  const pageContextMenu = (page: BuilderPage) => (
    <ContextMenuContent>
      <ContextMenuItem onSelect={() => setSettingsPageId(page.id)}>
        <Settings className="mr-2 h-4 w-4" />
        Settings…
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => handleDuplicatePage(page)}>
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={pages.length <= 1}
        className="text-destructive focus:text-destructive"
        onSelect={() => handleDeletePage(page.id)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );

  return (
    <>
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
              <ContextMenu key={page.id}>
                <ContextMenuTrigger asChild>
                  <DropdownMenuItem
                    className={cn(page.id === currentPageId && "bg-accent")}
                    onSelect={() => onSelectPage(page.id)}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{page.name}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{page.path}</span>
                    </div>
                  </DropdownMenuItem>
                </ContextMenuTrigger>
                {pageContextMenu(page)}
              </ContextMenu>
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
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0"
                aria-label="Page actions"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </ContextMenuTrigger>
            {pageContextMenu(currentPage)}
          </ContextMenu>
        ) : null}
      </div>

      <PageSettingsDialog
        page={settingsPage}
        pages={pages}
        isPublished={isPublished}
        open={settingsPageId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSettingsPageId(null);
          }
        }}
        onSave={handleSaveSettings}
      />
    </>
  );
}
