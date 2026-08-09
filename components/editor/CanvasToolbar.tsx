"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Toolbox } from "@/components/editor/Toolbox";
import { AIPanel } from "@/components/editor/AIPanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ToastActionElement } from "@/components/ui/toast";
import type { ComponentRegistry } from "@/builder/registry/types";
import type { BuilderDocument } from "@/builder/document/types";
import type { EditorSession } from "@/builder/history/session";
import { ChevronDown, ChevronUp, Download, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLBAR_VISIBLE_KEY = "editor-canvas-toolbar-visible";

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function ToolbarTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type CanvasToolbarProps = {
  readonly registry: ComponentRegistry;
  readonly portfolioId: string;
  readonly session: EditorSession;
  readonly onDocumentChange: () => void;
  readonly onRevertSnapshot: (snapshot: BuilderDocument) => void;
  readonly toast: (options: {
    title: string;
    description?: string;
    action?: ToastActionElement;
  }) => { id: string; dismiss: () => void };
  readonly onAdd: (componentType: string) => void;
  readonly pending: boolean;
  readonly onSave: () => void;
  readonly onExport: () => void;
};

export function CanvasToolbar({
  registry,
  portfolioId,
  session,
  onDocumentChange,
  onRevertSnapshot,
  toast,
  onAdd,
  pending,
  onSave,
  onExport,
}: CanvasToolbarProps) {
  const [visible, setVisible] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

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
    <TooltipProvider delayDuration={400}>
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
              <ToolbarTooltip label="Add element">
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={isAddOpen ? "outline" : "ghost"}
                    size="sm"
                    className={pillButtonClass}
                    aria-label="Add element"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </ToolbarTooltip>
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

            <AIPanel
              portfolioId={portfolioId}
              session={session}
              onDocumentChange={onDocumentChange}
              onRevertSnapshot={onRevertSnapshot}
              toast={toast}
            />

            <ToolbarDivider />

            <ToolbarTooltip label="Save">
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
            </ToolbarTooltip>

            <ToolbarTooltip label="Export JSON">
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
            </ToolbarTooltip>

            <ToolbarDivider />

            <ToolbarTooltip label="Hide toolbar">
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
            </ToolbarTooltip>
          </div>
        ) : (
          <ToolbarTooltip label="Show toolbar">
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
          </ToolbarTooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
