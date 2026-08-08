"use client";

import { useEffect, useState } from "react";
import { Toolbox } from "@/components/editor/Toolbox";
import { ViewportToggle } from "@/components/editor/ViewportToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ComponentRegistry } from "@/builder/registry/types";
import type { Breakpoint } from "@/builder/styles/types";
import { ChevronDown, ChevronUp, Copy, Download, EyeOff, Plus, Save, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLBAR_VISIBLE_KEY = "editor-canvas-toolbar-visible";

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

type CanvasToolbarProps = {
  readonly registry: ComponentRegistry;
  readonly onAdd: (componentType: string) => void;
  readonly viewport: Breakpoint;
  readonly onViewportChange: (value: Breakpoint) => void;
  readonly pending: boolean;
  readonly onSave: () => void;
  readonly status: string;
  readonly slug: string | null;
  readonly onPublish: () => void;
  readonly onUnpublish: () => void;
  readonly onCopyEmbed: () => void;
  readonly onExport: () => void;
};

export function CanvasToolbar({
  registry,
  onAdd,
  viewport,
  onViewportChange,
  pending,
  onSave,
  status,
  slug,
  onPublish,
  onUnpublish,
  onCopyEmbed,
  onExport,
}: CanvasToolbarProps) {
  const [visible, setVisible] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isPublished = status === "PUBLISHED";

  useEffect(() => {
    const stored = window.localStorage.getItem(TOOLBAR_VISIBLE_KEY);
    if (stored === "false") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount hydration from localStorage
      setVisible(false);
    }
  }, []);

  const handleVisibilityChange = (next: boolean) => {
    setVisible(next);
    window.localStorage.setItem(TOOLBAR_VISIBLE_KEY, String(next));
  };

  const handleAdd = (componentType: string) => {
    setIsAddOpen(false);
    onAdd(componentType);
  };

  const pillButtonClass = "h-8 w-8 rounded-full p-0";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      {visible ? (
        <div
          role="toolbar"
          aria-label="Canvas tools"
          className={cn(
            "pointer-events-auto flex items-center gap-0.5 rounded-full border border-border",
            "bg-background/95 px-1.5 py-1 shadow-lg backdrop-blur-sm",
          )}
        >
          <DropdownMenu open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={isAddOpen ? "outline" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3"
                aria-label="Add element"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-medium">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={12}
              className="editor-scroll w-72 p-2 max-h-[min(24rem,50vh)] overflow-y-auto"
            >
              <Toolbox registry={registry} onAdd={handleAdd} variant="compact" />
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarDivider />

          <ViewportToggle value={viewport} onChange={onViewportChange} variant="pill" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={pillButtonClass}
            disabled={pending}
            onClick={onSave}
            aria-label="Save"
          >
            <Save className="h-4 w-4" />
          </Button>

          {isPublished ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={pillButtonClass}
              disabled={pending}
              onClick={onUnpublish}
              aria-label="Unpublish"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={pillButtonClass}
              disabled={pending}
              onClick={onPublish}
              aria-label="Publish"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}

          {isPublished && slug ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={pillButtonClass}
              onClick={onCopyEmbed}
              aria-label="Copy embed code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={pillButtonClass}
            onClick={onExport}
            aria-label="Export JSON"
          >
            <Download className="h-4 w-4" />
          </Button>

          <ToolbarDivider />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={pillButtonClass}
            aria-label="Hide canvas toolbar"
            onClick={() => handleVisibilityChange(false)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto h-7 rounded-full border-border bg-background/95 px-2.5 shadow-md backdrop-blur-sm"
          aria-label="Show canvas toolbar"
          onClick={() => handleVisibilityChange(true)}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
