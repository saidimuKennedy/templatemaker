"use client";

import { ViewportToggle } from "@/components/editor/ViewportToggle";
import { formatViewportWidth } from "@/builder/styles/viewports";
import type { Breakpoint } from "@/builder/styles/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChevronDown, Copy, Database, EyeOff, ExternalLink, ListTree, Play, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LeftPanelTab = "navigator" | "resources";

type EditorTopBarProps = {
  readonly leftPanelTab: LeftPanelTab;
  readonly onLeftPanelTabChange: (tab: LeftPanelTab) => void;
  readonly viewport: Breakpoint;
  readonly onViewportChange: (value: Breakpoint) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly pending: boolean;
  readonly onPublish: () => void;
  readonly onPreview: () => void;
  readonly onUnpublish: () => void;
  readonly onCopyEmbed: () => void;
  readonly onOpenLive: () => void;
  readonly isPublished: boolean;
  readonly canPreview: boolean;
};

export function EditorTopBar({
  leftPanelTab,
  onLeftPanelTabChange,
  viewport,
  onViewportChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pending,
  onPublish,
  onPreview,
  onUnpublish,
  onCopyEmbed,
  onOpenLive,
  isPublished,
  canPreview,
}: EditorTopBarProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <div
        role="toolbar"
        aria-label="Editor"
        className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border bg-card px-3 md:px-4"
      >
        <div className="flex min-w-0 items-center">
          <div
            role="tablist"
            aria-label="Left panel"
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={leftPanelTab === "navigator"}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors",
                leftPanelTab === "navigator"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onLeftPanelTabChange("navigator")}
            >
              <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
              Navigator
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leftPanelTab === "resources"}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors",
                leftPanelTab === "resources"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onLeftPanelTabChange("resources")}
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              Data
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 max-md:scale-90">
          <ViewportToggle
            value={viewport}
            onChange={onViewportChange}
            variant="segment"
            showTooltips
            tooltipSide="bottom"
          />
          <span className="hidden min-w-[4.5rem] text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums sm:inline">
            {formatViewportWidth(viewport)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1">
          <ThemeToggle className="md:hidden" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canUndo}
                onClick={onUndo}
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canRedo}
                onClick={onRedo}
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canPreview}
                onClick={onPreview}
                aria-label="Preview"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {canPreview ? "Preview live site" : "Publish to preview"}
            </TooltipContent>
          </Tooltip>

          <div className="ml-1 flex items-stretch">
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-r-none px-3 text-xs font-medium"
              disabled={pending}
              onClick={onPublish}
            >
              {isPublished ? "Update" : "Publish"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-l-none border-l border-primary-foreground/20 px-1.5"
                  disabled={pending}
                  aria-label="Publish options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="text-xs" onClick={onPublish}>
                  {isPublished ? "Publish update" : "Publish site"}
                </DropdownMenuItem>
                {isPublished ? (
                  <>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={onOpenLive}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open live site
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={onCopyEmbed}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy embed code
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                      onClick={onUnpublish}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Unpublish
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
