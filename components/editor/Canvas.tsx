"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { beginDrag, endDrag, resolveDropCommand, updateDropTarget } from "@/builder/canvas/drag";
import { resolveKeyAction } from "@/builder/canvas/keyboard";
import { clearSelection, select } from "@/builder/canvas/selection";
import { initialCanvasState, type CanvasState, type DropPosition } from "@/builder/canvas/types";
import { findNodeAndParent } from "@/builder/document/tree";
import type { PageId } from "@/builder/document/types";
import type { EditorSession } from "@/builder/history/session";
import type { Command } from "@/builder/history/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { createRenderer } from "@/builder/renderer/renderer";
import { createStyledRenderer } from "@/builder/styles/apply";
import type { Breakpoint } from "@/builder/styles/types";
import type { NodeActions } from "@/components/editor/NodeActionsMenu";
import { NodeActionsMenuContent } from "@/components/editor/NodeActionsMenu";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * One blue for every canvas affordance — selection outline, its name
 * badge, and the drag/drop indicator. Kept as a literal rather than a
 * theme token because it must read as "editor chrome" in both light and
 * dark themes, distinct from whatever the user styles their own nodes.
 */
const SELECTION_COLOR = "#2563eb";

const EMPTY_NODE_IDS: readonly string[] = [];
const EMPTY_OVERLAY_STYLES: CSSProperties[] = [];

const VIEWPORT_MAX_WIDTH: Record<Breakpoint, string> = {
  base: "390px",
  sm: "640px",
  md: "768px",
  lg: "100%",
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
  readonly nodeActions: NodeActions;
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
  nodeActions,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuTargetRef = useRef<string | null>(null);
  const [overlayStyles, setOverlayStyles] = useState<CSSProperties[]>([]);
  const [dropOverlayStyle, setDropOverlayStyle] = useState<CSSProperties | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

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
      pages: document.pages,
    });
  }, [document, documentVersion, pageId, registry, styledRenderer]);

  const selectedNodeIds = canvasState.selection?.selectedNodeIds ?? EMPTY_NODE_IDS;
  const selectedNodeIdsKey = selectedNodeIds.join(",");
  const selectedNodeId = selectedNodeIds[0] ?? null;

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

  const applyCommand = useCallback(
    (command: Command) => {
      const result = session.execute(command);
      if (result.ok) {
        onDocumentChange();
      }
    },
    [onDocumentChange, session],
  );

  useEffect(() => {
    const updateOverlays = () => {
      if (selectedNodeIds.length === 0 || !containerRef.current) {
        setOverlayStyles((current) => (current.length === 0 ? current : EMPTY_OVERLAY_STYLES));
        return;
      }
      const containerRect = containerRef.current.getBoundingClientRect();
      const styles: CSSProperties[] = [];
      for (const nodeId of selectedNodeIds) {
        const element = containerRef.current.querySelector(`[data-node-id="${nodeId}"]`);
        if (!element) {
          continue;
        }
        const rect = element.getBoundingClientRect();
        styles.push({
          position: "absolute",
          top: rect.top - containerRect.top + containerRef.current.scrollTop,
          left: rect.left - containerRect.left + containerRef.current.scrollLeft,
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
          outline: `2px solid ${SELECTION_COLOR}`,
          outlineOffset: "2px",
          borderRadius: "2px",
        });
      }
      setOverlayStyles(styles);
    };

    updateOverlays();

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(updateOverlays);
    observer.observe(container);

    for (const nodeId of selectedNodeIds) {
      const element = container.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        observer.observe(element);
      }
    }

    window.addEventListener("resize", updateOverlays);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOverlays);
    };
  }, [selectedNodeIdsKey, documentVersion, viewport]);

  // Every rendered node is a candidate drag source except the page root
  // (moving a page's own root is rejected by applyMoveNode anyway). Stamped
  // imperatively rather than by modifying component renderers, since those
  // are registered, not owned by the canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const page = document.pages.find((entry) => entry.id === pageId);
    const rootId = page?.root.id;
    const nodes = container.querySelectorAll<HTMLElement>("[data-node-id]");
    nodes.forEach((element) => {
      const id = element.getAttribute("data-node-id");
      if (id && id !== rootId) {
        element.setAttribute("draggable", "true");
      } else {
        element.removeAttribute("draggable");
      }
    });
  }, [documentVersion, viewport, pageId, document]);

  useEffect(() => {
    const dropTarget = canvasState.dropTarget;
    if (!dropTarget || !containerRef.current) {
      setDropOverlayStyle(null);
      return;
    }
    const element = containerRef.current.querySelector(`[data-node-id="${dropTarget.nodeId}"]`);
    if (!element) {
      setDropOverlayStyle(null);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const top = rect.top - containerRect.top + containerRef.current.scrollTop;
    const left = rect.left - containerRect.left + containerRef.current.scrollLeft;

    if (dropTarget.position === "inside") {
      setDropOverlayStyle({
        position: "absolute",
        top,
        left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        outline: `2px solid ${SELECTION_COLOR}`,
        outlineOffset: "-2px",
        borderRadius: "2px",
        zIndex: 10,
      });
      return;
    }

    const lineTop = dropTarget.position === "before" ? top - 1 : top + rect.height - 1;
    setDropOverlayStyle({
      position: "absolute",
      top: lineTop,
      left,
      width: rect.width,
      height: "2px",
      pointerEvents: "none",
      backgroundColor: SELECTION_COLOR,
      zIndex: 10,
    });
  }, [canvasState.dropTarget, documentVersion]);

  const handleSelectNode = (nodeId: string, event?: MouseEvent<HTMLElement>) => {
    const additive = Boolean(event?.shiftKey || event?.metaKey || event?.ctrlKey);
    const toggle = Boolean(event?.metaKey || event?.ctrlKey);
    onCanvasStateChange(select(canvasState, pageId, nodeId, { additive, toggle }));
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    // Rendered nodes can be real anchors (Link/LinkBlock/Button with href) or
    // submit buttons. Inside the canvas a click means "select this node", so
    // suppress the element's own default action — otherwise clicking a link
    // navigates away from the editor instead of selecting it.
    event.preventDefault();

    const target = (event.target as HTMLElement).closest("[data-node-id]");
    if (!target || !containerRef.current?.contains(target)) {
      onCanvasStateChange(clearSelection(canvasState));
      return;
    }
    const nodeId = target.getAttribute("data-node-id");
    if (!nodeId) {
      return;
    }
    handleSelectNode(nodeId, event);
  };

  const handleCanvasContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("[data-node-id]");
    if (!target || !containerRef.current?.contains(target)) {
      event.preventDefault();
      event.stopPropagation();
      setContextMenuNodeId(null);
      contextMenuTargetRef.current = null;
      return;
    }
    const nodeId = target.getAttribute("data-node-id");
    if (!nodeId) {
      event.preventDefault();
      event.stopPropagation();
      setContextMenuNodeId(null);
      contextMenuTargetRef.current = null;
      return;
    }
    // Let Radix open the menu (it preventDefaults for us, blocking native
    // link menus). We only block the event on empty canvas above.
    setContextMenuNodeId(nodeId);
    contextMenuTargetRef.current = nodeId;
    handleSelectNode(nodeId, event);
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
      event.preventDefault();
      if (selectedNodeId) {
        nodeActions.duplicateNode(selectedNodeId);
      }
      return;
    }

    if (action === "undo" || action === "redo") {
      return;
    }

    event.preventDefault();

    if (action === "delete") {
      event.preventDefault();
      const deletable = selectedNodeIds.filter((nodeId) => {
        const page = document.pages.find((entry) => entry.id === pageId);
        if (!page) {
          return false;
        }
        const found = findNodeAndParent(page.root, nodeId);
        return found?.parent !== null;
      });
      if (deletable.length === 1) {
        nodeActions.deleteNode(deletable[0]!);
      } else if (deletable.length > 1) {
        nodeActions.deleteNodes(deletable);
      }
      return;
    }
  };

  const resolveDropPosition = (target: HTMLElement, clientY: number): DropPosition => {
    const type = target.getAttribute("data-node-type");
    const definition = type ? registry.get(type) : undefined;
    const allowedChildren = definition?.constraints.allowedChildren;
    const acceptsChildren = allowedChildren === undefined || allowedChildren.length > 0;
    const rect = target.getBoundingClientRect();
    const ratio = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
    if (acceptsChildren && ratio > 0.25 && ratio < 0.75) {
      return "inside";
    }
    return ratio < 0.5 ? "before" : "after";
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("[data-node-id]");
    const nodeId = target?.getAttribute("data-node-id");
    if (!nodeId) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", nodeId);
    onCanvasStateChange(beginDrag(canvasState, nodeId));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canvasState.dragging) {
      return;
    }
    event.preventDefault();
    const target = (event.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null;
    if (!target || !containerRef.current?.contains(target)) {
      return;
    }
    const nodeId = target.getAttribute("data-node-id");
    if (!nodeId || nodeId === canvasState.dragging.nodeId) {
      return;
    }
    const position = resolveDropPosition(target, event.clientY);
    const current = canvasState.dropTarget;
    if (!current || current.nodeId !== nodeId || current.position !== position) {
      onCanvasStateChange(updateDropTarget(canvasState, { nodeId, position }));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const { dragging, dropTarget } = canvasState;
    if (dragging && dropTarget) {
      const command = resolveDropCommand(document, pageId, dragging.nodeId, dropTarget);
      if (command) {
        applyCommand(command);
      }
    }
    onCanvasStateChange(endDrag(canvasState));
  };

  const handleDragEnd = () => {
    onCanvasStateChange(endDrag(canvasState));
  };

  const menuNodeId = contextMenuNodeId ?? selectedNodeId;
  const menuActionState = menuNodeId
    ? nodeActions.getActionState(menuNodeId)
    : { isPageRoot: true, canMoveUp: false, canMoveDown: false };

  const resolveMenuNodeId = () => contextMenuTargetRef.current ?? contextMenuNodeId ?? selectedNodeId;

  const menuHandlers = {
    onMoveUp: () => {
      const id = resolveMenuNodeId();
      if (id) nodeActions.moveNode(id, "up");
    },
    onMoveDown: () => {
      const id = resolveMenuNodeId();
      if (id) nodeActions.moveNode(id, "down");
    },
    onDuplicate: () => {
      const id = resolveMenuNodeId();
      if (id) nodeActions.duplicateNode(id);
    },
    onDelete: () => {
      const id = resolveMenuNodeId();
      if (id) nodeActions.deleteNode(id);
    },
    onRename: () => {
      const id = resolveMenuNodeId();
      if (id) nodeActions.onRename(id);
    },
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/*
        Editor-only minimum hit area: some nodes (thin text, empty leaf
        components before EmptyPlaceholder-style content is entered) can
        render at just a few pixels tall, which makes them hard to click to
        select. Scoped to this canvas instance and never emitted in
        published output (see lib/builder/content.tsx's renderPublished,
        which has no equivalent rule).
      */}
      <style>{`.builder-canvas-root [data-node-id] { min-height: 8px; }`}</style>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setContextMenuNodeId(null);
          }
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            ref={containerRef}
            tabIndex={0}
            role="application"
            aria-label="Portfolio canvas"
            className="builder-canvas-root editor-scroll relative min-h-0 flex-1 overflow-auto bg-muted/40 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasContextMenu}
            onKeyDown={handleKeyDown}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <div
              className="mx-auto min-h-full bg-background shadow-sm ring-1 ring-border/50 transition-[max-width]"
              style={{ maxWidth: VIEWPORT_MAX_WIDTH[viewport] }}
            >
              {renderedPage}
            </div>
            {/*
              The selection outline carries its own name badge, the way
              Webflow tags a selected element. Without it the canvas tells you
              *that* something is selected but never *what* — and with nested
              Containers/Stacks that all render as plain boxes, the outline
              alone is genuinely ambiguous. The badge sits above the box and
              falls back to the component type when the node is unnamed.
            */}
            {overlayStyles.map((style, index) => (
              <div key={selectedNodeIds[index] ?? index} aria-hidden="true" style={style}>
                {index === 0 && selectedFound ? (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "-2px",
                      marginBottom: "3px",
                      padding: "1px 6px",
                      borderRadius: "3px 3px 0 0",
                      backgroundColor: SELECTION_COLOR,
                      color: "#ffffff",
                      fontSize: "10px",
                      lineHeight: "16px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {selectedNodeIds.length > 1
                      ? `${selectedNodeIds.length} selected`
                      : (selectedFound.node.name ?? selectedFound.node.type)}
                  </span>
                ) : null}
              </div>
            ))}
            {dropOverlayStyle ? <div aria-hidden="true" style={dropOverlayStyle} /> : null}
          </div>
        </ContextMenuTrigger>
        <NodeActionsMenuContent state={menuActionState} handlers={menuHandlers} />
      </ContextMenu>
    </div>
  );
}

export { initialCanvasState };
