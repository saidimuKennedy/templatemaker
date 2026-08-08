"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  publishPortfolio,
  saveDocument,
  unpublishPortfolio,
} from "@/app/(dashboard)/editor/[id]/_actions";
import { Canvas, initialCanvasState } from "@/components/editor/Canvas";
import { Inspector } from "@/components/editor/Inspector";
import { Navigator } from "@/components/editor/Navigator";
import { Toolbox } from "@/components/editor/Toolbox";
import { ViewportToggle } from "@/components/editor/ViewportToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { findNodeAndParent } from "@/builder/document/tree";
import { generateNodeId } from "@/builder/document/id";
import type { BuilderDocument } from "@/builder/document/types";
import { createEditorSession } from "@/builder/history/session";
import type { Command } from "@/builder/history/types";
import { exportDocumentJson } from "@/builder/publish/export";
import type { Breakpoint } from "@/builder/styles/types";
import { createPortfolioRegistry } from "@/lib/builder";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Upload,
} from "lucide-react";

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
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const pageId = initialDocument.pages[0]?.id ?? "";
  const selectedNodeId = canvasState.selection?.selectedNodeIds[0] ?? null;

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
    [portfolioId, toast],
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
    [bumpDocumentVersion],
  );

  const handleAddComponent = useCallback(
    (componentType: string) => {
      setIsToolboxOpen(false);
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
    [handleCommand, registry, selectedNodeId, toast],
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
    <div className="mx-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <DropdownMenu open={isToolboxOpen} onOpenChange={setIsToolboxOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Add element"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-2 max-h-[32rem] overflow-y-auto">
            <Toolbox registry={registry} onAdd={handleAddComponent} />
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm capitalize text-muted-foreground">{status.toLowerCase()}</span>
      </div>

      <div className="flex items-center gap-2">
        <ViewportToggle value={viewport} onChange={setViewport} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={pending}
          onClick={() => handleSave()}
          aria-label="Save"
        >
          <Save className="h-4 w-4" />
        </Button>
        {status === "PUBLISHED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pending}
            onClick={handleUnpublish}
            aria-label="Unpublish"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pending}
            onClick={handlePublish}
            aria-label="Publish"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
        {status === "PUBLISHED" && slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCopyEmbedCode}
            aria-label="Copy embed code"
          >
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleExportJson}
          aria-label="Export JSON"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
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
    />
  );

  const toolbox = <Toolbox registry={registry} onAdd={handleAddComponent} />;

  const canvas = (
    <Canvas
      session={session}
      registry={registry}
      pageId={pageId}
      documentVersion={documentVersion}
      canvasState={canvasState}
      viewport={viewport}
      onCanvasStateChange={setCanvasState}
      onDocumentChange={bumpDocumentVersion}
    />
  );

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3">{toolbar}</div>
      <div className="hidden flex-1 min-h-0 md:grid md:grid-cols-[280px_minmax(0,1fr)_300px]">
        {navigatorPanel}
        {canvas}
        {inspector}
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
