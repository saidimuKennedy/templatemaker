"use client";

import { useEffect, useRef, useState } from "react";
import type { BuilderNode, BuilderProject, PageId } from "@/builder/document/types";
import { select, isSelected } from "@/builder/canvas/selection";
import type { CanvasState } from "@/builder/canvas/types";
import { createRenameNodeCommand } from "@/builder/inspector/edit";
import type { Command } from "@/builder/history/types";
import type { NodeActions } from "@/components/editor/NodeActionsMenu";
import { NodeActionsMenuContent } from "@/components/editor/NodeActionsMenu";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageSwitcher } from "@/components/editor/PageSwitcher";
import { cn } from "@/lib/utils";

type NavigatorProps = {
  readonly document: BuilderProject;
  readonly pageId: PageId;
  readonly canvasState: CanvasState;
  readonly onCanvasStateChange: (state: CanvasState) => void;
  readonly onCommand: (command: Command) => void;
  readonly nodeActions: NodeActions;
  readonly editingNodeId: string | null;
  readonly onStartEdit: (nodeId: string) => void;
  readonly onEndEdit: () => void;
  readonly onSelectPage: (pageId: PageId) => void;
  readonly onNotify: (message: { title: string; description?: string }) => void;
};

type NodeRowProps = {
  readonly node: BuilderNode;
  readonly depth: number;
  readonly pageId: PageId;
  readonly canvasState: CanvasState;
  readonly onSelectNode: (nodeId: string, event?: React.MouseEvent) => void;
  readonly onCommand: (command: Command) => void;
  readonly nodeActions: NodeActions;
  readonly collapsedMap: Record<string, boolean>;
  readonly toggleCollapse: (id: string) => void;
  readonly editingNodeId: string | null;
  readonly onStartEdit: (nodeId: string) => void;
  readonly onEndEdit: () => void;
};

function findAncestorIds(root: BuilderNode, targetId: string, path: string[] = []): string[] | undefined {
  if (root.id === targetId) {
    return path;
  }
  for (const child of root.children) {
    const found = findAncestorIds(child, targetId, [...path, root.id]);
    if (found) return found;
  }
  return undefined;
}

function NodeRow({
  node,
  depth,
  pageId,
  canvasState,
  onSelectNode,
  onCommand,
  nodeActions,
  collapsedMap,
  toggleCollapse,
  editingNodeId,
  onStartEdit,
  onEndEdit,
}: NodeRowProps) {
  const selected = isSelected(canvasState, node.id);
  const hasChildren = node.children.length > 0;
  const isEditing = editingNodeId === node.id;
  const [draftName, setDraftName] = useState(node.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  // collapsedMap is the single source of truth for expansion. Selecting a
  // node writes its ancestors open in collapsedMap (see Navigator's
  // effect) rather than being overridden here at render time — an
  // override would win on every render and make the chevron dead for
  // every ancestor of the selection, i.e. exactly the branch the user is
  // working inside.
  const isCollapsed = collapsedMap[node.id] ?? false;

  useEffect(() => {
    if (!isEditing) return;
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }, [isEditing]);

  const handleSelect = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelectNode(node.id, e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraftName(node.name ?? "");
    skipBlurCommitRef.current = false;
    onStartEdit(node.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollapse(node.id);
  };

  const commitRename = () => {
    // Committing ends edit mode, which unmounts the input while it still
    // has focus — that can fire onBlur, which would call this a second
    // time. On that second pass `node` may not have re-rendered with the
    // new name yet, so the no-op guard below wouldn't catch it and an
    // identical RenameNode would land on the undo stack, making the
    // first Ctrl+Z look like it did nothing. Disarm blur the same way
    // cancelRename does.
    skipBlurCommitRef.current = true;

    const trimmed = draftName.trim();
    const normalizedName = trimmed === "" ? undefined : trimmed;
    const currentName = node.name;

    if (normalizedName === currentName) {
      onEndEdit();
      return;
    }

    onCommand(createRenameNodeCommand(pageId, node, draftName));
    onEndEdit();
  };

  const cancelRename = () => {
    skipBlurCommitRef.current = true;
    setDraftName(node.name ?? "");
    onEndEdit();
  };

  const actionState = nodeActions.getActionState(node.id);
  const menuHandlers = {
    onMoveUp: () => nodeActions.moveNode(node.id, "up"),
    onMoveDown: () => nodeActions.moveNode(node.id, "down"),
    onDuplicate: () => nodeActions.duplicateNode(node.id),
    onDelete: () => nodeActions.deleteNode(node.id),
    onRename: () => onStartEdit(node.id),
  };

  const row = (
    <div
      role="treeitem"
      aria-selected={selected}
      tabIndex={isEditing ? -1 : 0}
      data-navigator-node-id={node.id}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={
        isEditing
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onSelectNode(node.id);
              }
            }
      }
      // 10px per level rather than 12: the fixture reaches depth 7, and
      // at 12px the indent alone ate enough of a 220px column to
      // truncate the names this panel exists to show.
      style={{ paddingLeft: `${depth * 10 + 6}px` }}
      title={node.name ? `${node.name} — ${node.type}` : node.type}
      className={cn(
        "group flex items-center h-8 pr-2 gap-1 rounded-md text-xs font-medium cursor-pointer transition-colors select-none",
        selected
          ? "bg-primary text-primary-foreground font-semibold"
          : "hover:bg-muted/60 text-foreground",
      )}
    >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "flex items-center justify-center h-4 w-4 rounded shrink-0 transition-transform",
              selected ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
            onBlur={() => {
              if (skipBlurCommitRef.current) {
                skipBlurCommitRef.current = false;
                return;
              }
              commitRename();
            }}
            className={cn(
              "flex-1 min-w-0 h-6 px-1 rounded text-xs font-medium bg-background text-foreground border border-border outline-none focus:ring-1 focus:ring-ring",
            )}
          />
        ) : (
          <>
            {/*
              The name truncates; the type never does. A clipped type
              ("Headi…", "St…") costs the same horizontal space as the full
              word and tells the reader nothing, so it gets shrink-0 and the
              name absorbs the pressure instead. Full text is on the row's
              title attribute either way.
            */}
            {node.name ? (
              <>
                <span className="truncate min-w-0">{node.name}</span>
                <span
                  className={cn(
                    "shrink-0 font-normal text-[10px]",
                    selected ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {node.type}
                </span>
              </>
            ) : (
              <span className="truncate min-w-0">{node.type}</span>
            )}
          </>
        )}
      </div>
  );

  return (
    <div className="flex flex-col">
      {isEditing ? (
        row
      ) : (
        <ContextMenu
          onOpenChange={(open) => {
            if (open) {
              onSelectNode(node.id);
            }
          }}
        >
          <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
          <NodeActionsMenuContent state={actionState} handlers={menuHandlers} />
        </ContextMenu>
      )}
      {hasChildren && !isCollapsed ? (
        <div className="flex flex-col" role="group">
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              pageId={pageId}
              canvasState={canvasState}
              onSelectNode={onSelectNode}
              onCommand={onCommand}
              nodeActions={nodeActions}
              collapsedMap={collapsedMap}
              toggleCollapse={toggleCollapse}
              editingNodeId={editingNodeId}
              onStartEdit={onStartEdit}
              onEndEdit={onEndEdit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Navigator({
  document,
  pageId,
  canvasState,
  onCanvasStateChange,
  onCommand,
  nodeActions,
  editingNodeId,
  onStartEdit,
  onEndEdit,
  onSelectPage,
  onNotify,
}: NavigatorProps) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [expandedForSelection, setExpandedForSelection] = useState<string | null>(null);
  const isInternalSelectionRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const page = document.pages.find((p) => p.id === pageId);
  const selectedNodeIds = canvasState.selection?.selectedNodeIds ?? [];
  const selectedNodeId = selectedNodeIds[0] ?? null;

  // Write every selected node's ancestors open.
  const selectionKey = selectedNodeIds.join(",");
  if (selectionKey !== expandedForSelection) {
    setExpandedForSelection(selectionKey);
    if (selectedNodeIds.length > 0 && page) {
      const ancestorIds = new Set<string>();
      for (const nodeId of selectedNodeIds) {
        const ancestors = findAncestorIds(page.root, nodeId);
        ancestors?.forEach((id) => ancestorIds.add(id));
      }
      const stillCollapsed = [...ancestorIds].filter((id) => collapsedMap[id]);
      if (stillCollapsed.length > 0) {
        setCollapsedMap((prev) => {
          const next = { ...prev };
          for (const id of stillCollapsed) {
            next[id] = false;
          }
          return next;
        });
      }
    }
  }

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectNode = (nodeId: string, event?: React.MouseEvent) => {
    if (nodeId !== selectedNodeId && !selectedNodeIds.includes(nodeId)) {
      isInternalSelectionRef.current = true;
    }
    const additive = Boolean(event?.shiftKey || event?.metaKey || event?.ctrlKey);
    const toggle = Boolean(event?.metaKey || event?.ctrlKey);
    onCanvasStateChange(select(canvasState, pageId, nodeId, { additive, toggle }));
  };

  useEffect(() => {
    if (!selectedNodeId || !page) {
      isInternalSelectionRef.current = false;
      return;
    }

    const isInternal = isInternalSelectionRef.current;
    isInternalSelectionRef.current = false;

    // Scroll into view only when selection came from outside the
    // Navigator (e.g. a canvas click) — scrolling on a click the user
    // just made in this panel yanks the list under their cursor.
    // Deferred a tick so any expansion above has rendered and the target
    // row exists to measure.
    if (isInternal) {
      return;
    }

    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const rowElement = container.querySelector<HTMLElement>(
        `[data-navigator-node-id="${selectedNodeId}"]`,
      );
      if (!rowElement) return;

      const containerRect = container.getBoundingClientRect();
      const rowRect = rowElement.getBoundingClientRect();

      // scrollTop deltas rather than scrollIntoView: the latter walks up
      // and scrolls ancestor scroll containers too, which would jump the
      // whole editor page.
      if (rowRect.top < containerRect.top) {
        container.scrollTop += rowRect.top - containerRect.top;
      } else if (rowRect.bottom > containerRect.bottom) {
        container.scrollTop += rowRect.bottom - containerRect.bottom;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedNodeId, page]);

  if (!page) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No page found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Navigator
        </h2>
      </div>
      <PageSwitcher
        pages={document.pages}
        currentPageId={pageId}
        onSelectPage={onSelectPage}
        onCommand={onCommand}
        onNotify={onNotify}
      />
      <div
        ref={containerRef}
        className="editor-scroll flex-1 overflow-y-auto p-1 space-y-0.5"
        role="tree"
        aria-label="Document Tree"
      >
        <NodeRow
          node={page.root}
          depth={0}
          pageId={pageId}
          canvasState={canvasState}
          onSelectNode={handleSelectNode}
          onCommand={onCommand}
          nodeActions={nodeActions}
          collapsedMap={collapsedMap}
          toggleCollapse={toggleCollapse}
          editingNodeId={editingNodeId}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
        />
      </div>
    </div>
  );
}
