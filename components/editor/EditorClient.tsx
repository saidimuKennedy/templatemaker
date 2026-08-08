"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  publishPortfolio,
  saveDocument,
  unpublishPortfolio,
} from "@/app/(dashboard)/editor/[id]/_actions";
import { Canvas, initialCanvasState } from "@/components/editor/Canvas";
import { CanvasToolbar } from "@/components/editor/CanvasToolbar";
import { Inspector } from "@/components/editor/Inspector";
import type { NodeActionState, NodeActions } from "@/components/editor/NodeActionsMenu";
import { Navigator } from "@/components/editor/Navigator";
import { Toolbox } from "@/components/editor/Toolbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { resolveDropCommand } from "@/builder/canvas/drag";
import { resolveDuplicateCommand } from "@/builder/canvas/duplicate";
import { clearSelection } from "@/builder/canvas/selection";
import { findNodeAndParent } from "@/builder/document/tree";
import { generateNodeId } from "@/builder/document/id";
import type { BuilderDocument } from "@/builder/document/types";
import { createEditorSession } from "@/builder/history/session";
import type { Command } from "@/builder/history/types";
import { exportDocumentJson } from "@/builder/publish/export";
import type { Breakpoint } from "@/builder/styles/types";
import { createPortfolioRegistry } from "@/lib/builder";
import { cn } from "@/lib/utils";

const NAVIGATOR_WIDTH_KEY = "editor-navigator-width";
const INSPECTOR_WIDTH_KEY = "editor-inspector-width";
const DEFAULT_NAVIGATOR_WIDTH = 280;
const DEFAULT_INSPECTOR_WIDTH = 300;
const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 480;

function clampPanelWidth(width: number): number {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

function readStoredWidth(key: string, fallback: number): number {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }
  const parsed = Number.parseInt(stored, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return clampPanelWidth(parsed);
}

type PanelResizeHandleProps = {
  readonly side: "navigator" | "inspector";
  readonly onResize: (deltaX: number) => void;
  readonly onResizeEnd: () => void;
};

function PanelResizeHandle({ side, onResize, onResizeEnd }: PanelResizeHandleProps) {
  const draggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const delta = side === "navigator" ? event.movementX : -event.movementX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEnd();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize, onResizeEnd, side]);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "navigator" ? "Resize navigator panel" : "Resize inspector panel"}
      className={cn(
        "absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize touch-none transition-colors hover:bg-primary/25 active:bg-primary/40",
        side === "navigator" ? "right-0 -mr-0.5" : "left-0 -ml-0.5",
      )}
      onMouseDown={handleMouseDown}
    />
  );
}

type EditorClientProps = {
  portfolioId: string;
  initialDocument: BuilderDocument;
  status: string;
  slug: string | null;
};

export function EditorClient({ portfolioId, initialDocument, status, slug }: EditorClientProps) {
  const registry = createPortfolioRegistry();
  const [session] = useState(() => createEditorSession(initialDocument));
  const skipAutosaveRef = useRef(true);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [canvasState, setCanvasState] = useState(initialCanvasState);
  const [viewport, setViewport] = useState<Breakpoint>("lg");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [navigatorWidth, setNavigatorWidth] = useState(DEFAULT_NAVIGATOR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const pageId = initialDocument.pages[0]?.id ?? "";
  const selectedNodeId = canvasState.selection?.selectedNodeIds[0] ?? null;

  // SSR trap: localStorage is read after mount so server and first client
  // render share the same default widths — reading during render causes
  // a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount hydration from localStorage
    setNavigatorWidth(readStoredWidth(NAVIGATOR_WIDTH_KEY, DEFAULT_NAVIGATOR_WIDTH));
    setInspectorWidth(readStoredWidth(INSPECTOR_WIDTH_KEY, DEFAULT_INSPECTOR_WIDTH));
  }, []);

  const persistNavigatorWidth = useCallback(() => {
    window.localStorage.setItem(NAVIGATOR_WIDTH_KEY, String(navigatorWidth));
  }, [navigatorWidth]);

  const persistInspectorWidth = useCallback(() => {
    window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidth));
  }, [inspectorWidth]);

  const bumpDocumentVersion = useCallback(() => {
    setDocumentVersion((current) => current + 1);
  }, []);

  const handleSave = useCallback(
    (options?: { silent?: boolean }) => {
      startTransition(async () => {
        try {
          const result = await saveDocument(
            portfolioId,
            exportDocumentJson(session.getDocument()),
          );
          if (!result.success) {
            if (!options?.silent) {
              toast({
                title: "Validation failed",
                description: result.errors?.[0]?.message ?? "Document could not be saved.",
              });
            }
            return;
          }
          if (!options?.silent) {
            toast({ title: "Saved", description: "Portfolio content updated." });
          }
        } catch {
          if (!options?.silent) {
            toast({ title: "Error", description: "Could not save portfolio." });
          }
        }
      });
    },
    [portfolioId, session, toast],
  );

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (documentVersion === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      handleSave({ silent: true });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [documentVersion, handleSave]);

  const handleCommand = useCallback(
    (command: Command) => {
      const result = session.execute(command);
      if (result.ok) {
        bumpDocumentVersion();
      }
    },
    [bumpDocumentVersion, session],
  );

  const getActionState = useCallback(
    (nodeId: string): NodeActionState => {
      const page = session.getDocument().pages.find((entry) => entry.id === pageId);
      if (!page) {
        return { isPageRoot: true, canMoveUp: false, canMoveDown: false };
      }
      const found = findNodeAndParent(page.root, nodeId);
      if (!found) {
        return { isPageRoot: true, canMoveUp: false, canMoveDown: false };
      }
      return {
        isPageRoot: found.parent === null,
        canMoveUp: Boolean(found.parent && found.index > 0),
        canMoveDown: Boolean(
          found.parent && found.index < found.parent.children.length - 1,
        ),
      };
    },
    [pageId, session, documentVersion],
  );

  const moveNode = useCallback(
    (nodeId: string, direction: "up" | "down") => {
      const document = session.getDocument();
      const page = document.pages.find((entry) => entry.id === pageId);
      if (!page) {
        return;
      }
      const found = findNodeAndParent(page.root, nodeId);
      if (!found?.parent) {
        return;
      }
      const { parent, index } = found;
      const siblingIndex = direction === "up" ? index - 1 : index + 1;
      const sibling = parent.children[siblingIndex];
      if (!sibling) {
        return;
      }
      const dropTarget =
        direction === "up"
          ? { nodeId: sibling.id, position: "before" as const }
          : { nodeId: sibling.id, position: "after" as const };
      const command = resolveDropCommand(document, pageId, nodeId, dropTarget);
      if (command) {
        handleCommand(command);
      }
    },
    [handleCommand, pageId, session, documentVersion],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const state = getActionState(nodeId);
      if (state.isPageRoot) {
        return;
      }
      const command = resolveDuplicateCommand(session.getDocument(), pageId, nodeId);
      if (command) {
        handleCommand(command);
      }
    },
    [getActionState, handleCommand, pageId, session, documentVersion],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const state = getActionState(nodeId);
      if (state.isPageRoot) {
        return;
      }
      handleCommand({
        type: "DeleteNode",
        payload: { pageId, nodeId },
      });
      setCanvasState((current) => clearSelection(current));
    },
    [getActionState, handleCommand, pageId],
  );

  const handleRenameNode = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const nodeActions: NodeActions = {
    getActionState,
    moveNode,
    duplicateNode,
    deleteNode,
    onRename: handleRenameNode,
  };

  const handleAddComponent = useCallback(
    (componentType: string) => {
      const definition = registry.get(componentType);
      if (!definition) {
        return;
      }
      if (definition.constraints.rootOnly) {
        toast({
          title: "Can't add here",
          description: `${componentType} can only be a page's root node.`,
        });
        return;
      }

      const page = session.getDocument().pages[0];
      if (!page) {
        return;
      }

      let parentId = page.root.id;
      if (selectedNodeId) {
        const found = findNodeAndParent(page.root, selectedNodeId);
        if (found) {
          const parentDefinition = registry.get(found.node.type);
          const allowedChildren = parentDefinition?.constraints.allowedChildren;
          if (
            allowedChildren === undefined ||
            allowedChildren.includes(componentType)
          ) {
            parentId = found.node.id;
          }
        }
      }

      handleCommand({
        type: "CreateNode",
        payload: {
          pageId: page.id,
          parentId,
          node: {
            id: generateNodeId(),
            type: componentType,
            props: { ...definition.defaultProps },
            styles: {},
            children: [],
          },
        },
      });
    },
    [handleCommand, registry, selectedNodeId, session, toast],
  );

  const handlePublish = () => {
    startTransition(async () => {
      try {
        const saveResult = await saveDocument(
          portfolioId,
          exportDocumentJson(session.getDocument()),
        );
        if (!saveResult.success) {
          toast({
            title: "Cannot publish",
            description: saveResult.errors?.[0]?.message ?? "Fix validation errors before publishing.",
          });
          return;
        }
        const result = await publishPortfolio(portfolioId);
        if (!result.success) {
          toast({
            title: "Cannot publish",
            description: result.error ?? result.errors?.[0]?.message ?? "Publishing failed.",
          });
          return;
        }
        toast({
          title: "Published",
          description: result.slug ? `Live at /p/${result.slug}` : "Portfolio is live.",
        });
      } catch {
        toast({ title: "Error", description: "Could not publish portfolio." });
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      try {
        await unpublishPortfolio(portfolioId);
        toast({ title: "Unpublished", description: "Portfolio is no longer public." });
      } catch {
        toast({ title: "Error", description: "Could not unpublish portfolio." });
      }
    });
  };

  const handleCopyEmbedCode = async () => {
    if (!slug) {
      return;
    }
    const src = `${window.location.origin}/embed/${slug}`;
    const snippet = `<iframe src="${src}" style="width:100%;border:0" title="Portfolio"></iframe>`;
    try {
      await navigator.clipboard.writeText(snippet);
      toast({ title: "Copied", description: "Embed code copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not copy embed code." });
    }
  };

  const handleExportJson = () => {
    const json = exportDocumentJson(session.getDocument());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug ?? portfolioId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toolbar = (
    <div className="mx-4 flex items-center py-0.5">
      <span className="text-sm capitalize text-muted-foreground">{status.toLowerCase()}</span>
    </div>
  );

  const inspector = (
    <Inspector
      key={selectedNodeId}
      document={session.getDocument()}
      pageId={pageId}
      selectedNodeId={selectedNodeId}
      registry={registry}
      viewport={viewport}
      onCommand={handleCommand}
    />
  );

  const navigatorPanel = (
    <Navigator
      document={session.getDocument()}
      pageId={pageId}
      canvasState={canvasState}
      onCanvasStateChange={setCanvasState}
      onCommand={handleCommand}
      nodeActions={nodeActions}
      editingNodeId={editingNodeId}
      onStartEdit={setEditingNodeId}
      onEndEdit={() => setEditingNodeId(null)}
    />
  );

  const toolbox = <Toolbox registry={registry} onAdd={handleAddComponent} />;

  const canvas = (
    <div className="relative h-full min-h-0">
      <Canvas
        session={session}
        registry={registry}
        pageId={pageId}
        documentVersion={documentVersion}
        canvasState={canvasState}
        viewport={viewport}
        onCanvasStateChange={setCanvasState}
        onDocumentChange={bumpDocumentVersion}
        nodeActions={nodeActions}
      />
      <CanvasToolbar
        registry={registry}
        onAdd={handleAddComponent}
        viewport={viewport}
        onViewportChange={setViewport}
        pending={pending}
        onSave={() => handleSave()}
        status={status}
        slug={slug}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onCopyEmbed={handleCopyEmbedCode}
        onExport={handleExportJson}
      />
    </div>
  );

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-2">{toolbar}</div>
      <div
        className="editor-shell hidden flex-1 min-h-0 md:grid"
        style={{
          gridTemplateColumns: `${navigatorWidth}px minmax(0, 1fr) ${inspectorWidth}px`,
        }}
      >
        <div className="relative h-full min-h-0 min-w-0">
          {navigatorPanel}
          <PanelResizeHandle
            side="navigator"
            onResize={(delta) => {
              setNavigatorWidth((current) => clampPanelWidth(current + delta));
            }}
            onResizeEnd={persistNavigatorWidth}
          />
        </div>
        <div className="min-h-0 min-w-0">{canvas}</div>
        <div className="relative h-full min-h-0 min-w-0">
          <PanelResizeHandle
            side="inspector"
            onResize={(delta) => {
              setInspectorWidth((current) => clampPanelWidth(current + delta));
            }}
            onResizeEnd={persistInspectorWidth}
          />
          {inspector}
        </div>
      </div>

      <div className="md:hidden">
        <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="navigator">Navigator</TabsTrigger>
            <TabsTrigger value="toolbox">Components</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="inspector">Properties</TabsTrigger>
          </TabsList>
          <TabsContent value="navigator" className="mt-4 min-h-[50vh]">
            {navigatorPanel}
          </TabsContent>
          <TabsContent value="toolbox" className="mt-4 min-h-[50vh]">
            {toolbox}
          </TabsContent>
          <TabsContent value="canvas" className="mt-4 min-h-[60vh]">
            {canvas}
          </TabsContent>
          <TabsContent value="inspector" className="mt-4 min-h-[50vh]">
            {inspector}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
