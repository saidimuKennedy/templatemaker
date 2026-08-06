"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  publishPortfolio,
  saveDocument,
  unpublishPortfolio,
} from "@/app/(dashboard)/editor/[id]/_actions";
import { Canvas, initialCanvasState } from "@/components/editor/Canvas";
import { Inspector } from "@/components/editor/Inspector";
import { Toolbox } from "@/components/editor/Toolbox";
import { ViewportToggle } from "@/components/editor/ViewportToggle";
import { Button } from "@/components/ui/button";
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

type EditorClientProps = {
  portfolioId: string;
  initialDocument: BuilderDocument;
  status: string;
};

export function EditorClient({ portfolioId, initialDocument, status }: EditorClientProps) {
  const registry = createPortfolioRegistry();
  const [session] = useState(() => createEditorSession(initialDocument));
  const skipAutosaveRef = useRef(true);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [canvasState, setCanvasState] = useState(initialCanvasState);
  const [viewport, setViewport] = useState<Breakpoint>("base");
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
      const definition = registry.get(componentType);
      if (!definition) {
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
    [handleCommand, registry, selectedNodeId],
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

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm capitalize text-muted-foreground">{status.toLowerCase()}</span>
      <ViewportToggle value={viewport} onChange={setViewport} />
      <Button type="button" variant="outline" disabled={pending} onClick={() => handleSave()}>
        Save
      </Button>
      {status === "PUBLISHED" ? (
        <Button type="button" variant="outline" disabled={pending} onClick={handleUnpublish}>
          Unpublish
        </Button>
      ) : (
        <Button type="button" disabled={pending} onClick={handlePublish}>
          Publish
        </Button>
      )}
    </div>
  );

  const inspector = (
    <Inspector
      key={documentVersion}
      document={session.getDocument()}
      pageId={pageId}
      selectedNodeId={selectedNodeId}
      registry={registry}
      viewport={viewport}
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
    <div className="space-y-4">
      {toolbar}
      <div className="hidden h-[calc(100vh-12rem)] md:grid md:grid-cols-[220px_minmax(0,1fr)_280px] md:gap-4">
        {toolbox}
        {canvas}
        {inspector}
      </div>

      <div className="md:hidden">
        <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="toolbox">Components</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="inspector">Properties</TabsTrigger>
          </TabsList>
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
