"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { resolveDropCommand } from "@/builder/canvas/drag";
import { resolveKeyAction } from "@/builder/canvas/keyboard";
import { clearSelection, select } from "@/builder/canvas/selection";
import { initialCanvasState, type CanvasState } from "@/builder/canvas/types";
import { findNodeAndParent } from "@/builder/document/tree";
import type { PageId } from "@/builder/document/types";
import type { EditorSession } from "@/builder/history/session";
import type { Command } from "@/builder/history/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { createRenderer } from "@/builder/renderer/renderer";
import { createStyledRenderer } from "@/builder/styles/apply";
import type { Breakpoint } from "@/builder/styles/types";
import { Button } from "@/components/ui/button";

const VIEWPORT_MAX_WIDTH: Record<Breakpoint, string> = {
  base: "390px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
};

type CanvasProps = {
  readonly session: EditorSession;
  readonly registry: ComponentRegistry;
  readonly pageId: PageId;
  readonly documentVersion: number;
  readonly canvasState: CanvasState;
  readonly viewport: Breakpoint;
  readonly onCanvasStateChange: (state: CanvasState) => void;
  readonly onDocumentChange: () => void;
};

export function Canvas({
  session,
  registry,
  pageId,
  documentVersion,
  canvasState,
  viewport,
  onCanvasStateChange,
  onDocumentChange,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);

  const document = session.getDocument();

  const styledRenderer = useMemo(
    () => createStyledRenderer(createRenderer(), viewport),
    [viewport],
  );

  const renderedPage = useMemo(() => {
    const page = document.pages.find((entry) => entry.id === pageId);
    if (!page) {
      return null;
    }
    return styledRenderer.renderPage(page, {
      registry,
      target: "editor-preview",
    });
  }, [document, documentVersion, pageId, registry, styledRenderer]);

  const selectedNodeId = canvasState.selection?.selectedNodeIds[0] ?? null;

  const selectedFound = useMemo(() => {
    if (!selectedNodeId) {
      return undefined;
    }
    const page = document.pages.find((entry) => entry.id === pageId);
    if (!page) {
      return undefined;
    }
    return findNodeAndParent(page.root, selectedNodeId);
  }, [document, pageId, selectedNodeId, documentVersion]);

  const isPageRoot = selectedFound?.parent === null;
  const canMoveUp = Boolean(
    selectedFound && selectedFound.parent && selectedFound.index > 0,
  );
  const canMoveDown = Boolean(
    selectedFound &&
      selectedFound.parent &&
      selectedFound.index < selectedFound.parent.children.length - 1,
  );

  const applyCommand = useCallback(
    (command: Command) => {
      const result = session.execute(command);
      if (result.ok) {
        onDocumentChange();
      }
    },
    [onDocumentChange, session],
  );

  const runHistoryAction = useCallback(
    (action: (currentSession: EditorSession) => void) => {
      action(session);
      onDocumentChange();
    },
    [onDocumentChange, session],
  );

  useEffect(() => {
    const updateOverlay = () => {
      if (!selectedNodeId || !containerRef.current) {
        setOverlayStyle(null);
        return;
      }
      const element = containerRef.current.querySelector(
        `[data-node-id="${selectedNodeId}"]`,
      );
      if (!element) {
        setOverlayStyle(null);
        return;
      }
      const containerRect = containerRef.current.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      setOverlayStyle({
        position: "absolute",
        top: rect.top - containerRect.top + containerRef.current.scrollTop,
        left: rect.left - containerRect.left + containerRef.current.scrollLeft,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        outline: "2px solid var(--foreground)",
        outlineOffset: "2px",
        borderRadius: "2px",
      });
    };

    updateOverlay();
    window.addEventListener("resize", updateOverlay);
    return () => window.removeEventListener("resize", updateOverlay);
  }, [selectedNodeId, documentVersion]);

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("[data-node-id]");
    if (!target || !containerRef.current?.contains(target)) {
      onCanvasStateChange(clearSelection(canvasState));
      return;
    }
    const nodeId = target.getAttribute("data-node-id");
    if (!nodeId) {
      return;
    }
    onCanvasStateChange(select(canvasState, pageId, nodeId));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = resolveKeyAction({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
    });

    if (!action) {
      return;
    }

    if (action === "deselect") {
      event.preventDefault();
      onCanvasStateChange(clearSelection(canvasState));
      return;
    }

    if (action === "duplicate") {
      // TODO: node duplication is a follow-up.
      return;
    }

    event.preventDefault();

    if (action === "undo") {
      runHistoryAction((currentSession) => {
        currentSession.undo();
      });
      return;
    }

    if (action === "redo") {
      runHistoryAction((currentSession) => {
        currentSession.redo();
      });
      return;
    }

    if (action === "delete" && selectedNodeId && !isPageRoot) {
      applyCommand({
        type: "DeleteNode",
        payload: { pageId, nodeId: selectedNodeId },
      });
      onCanvasStateChange(clearSelection(canvasState));
    }
  };

  const moveSelected = (direction: "up" | "down") => {
    if (!selectedNodeId || !selectedFound?.parent) {
      return;
    }
    const { parent, index } = selectedFound;
    const siblingIndex = direction === "up" ? index - 1 : index + 1;
    const sibling = parent.children[siblingIndex];
    if (!sibling) {
      return;
    }
    const dropTarget =
      direction === "up"
        ? { nodeId: sibling.id, position: "before" as const }
        : { nodeId: sibling.id, position: "after" as const };
    const command = resolveDropCommand(document, pageId, selectedNodeId, dropTarget);
    if (command) {
      applyCommand(command);
    }
  };

  const deleteSelected = () => {
    if (!selectedNodeId || isPageRoot) {
      return;
    }
    applyCommand({
      type: "DeleteNode",
      payload: { pageId, nodeId: selectedNodeId },
    });
    onCanvasStateChange(clearSelection(canvasState));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {selectedNodeId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Selected node</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canMoveUp}
            onClick={() => moveSelected("up")}
          >
            Up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canMoveDown}
            onClick={() => moveSelected("down")}
          >
            Down
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPageRoot}
            onClick={deleteSelected}
          >
            Delete
          </Button>
        </div>
      ) : null}

      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="Portfolio canvas"
        className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
      >
        <div className="mx-auto transition-[max-width]" style={{ maxWidth: VIEWPORT_MAX_WIDTH[viewport] }}>
          {renderedPage}
        </div>
        {overlayStyle ? <div aria-hidden="true" style={overlayStyle} /> : null}
      </div>
    </div>
  );
}

export { initialCanvasState };
