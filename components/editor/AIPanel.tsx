"use client";

import { useState, useTransition } from "react";
import { generateFromPrompt } from "@/app/(dashboard)/editor/[id]/_actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { applyAIResult } from "@/builder/ai/apply";
import type { BuilderDocument } from "@/builder/document/types";
import type { EditorSession } from "@/builder/history/session";
import { exportDocumentJson } from "@/builder/publish/export";
import { AI_RATE_LIMITS } from "@/lib/ai/rate-limit";
import { Sparkles } from "lucide-react";

type AIPanelProps = {
  readonly portfolioId: string;
  readonly session: EditorSession;
  readonly onDocumentChange: () => void;
  readonly onRevertSnapshot: (snapshot: BuilderDocument) => void;
  readonly toast: (options: {
    title: string;
    description?: string;
    action?: ToastActionElement;
  }) => { id: string; dismiss: () => void };
};

function cloneDocument(document: BuilderDocument): BuilderDocument {
  return JSON.parse(exportDocumentJson(document)) as BuilderDocument;
}

export function AIPanel({
  portfolioId,
  session,
  onDocumentChange,
  onRevertSnapshot,
  toast,
}: AIPanelProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || pending) {
      return;
    }

    const preGenerationSnapshot = cloneDocument(session.getDocument());

    startTransition(async () => {
      try {
        const result = await generateFromPrompt(
          portfolioId,
          trimmed,
          exportDocumentJson(session.getDocument()),
        );

        if (!result.success) {
          toast({
            title: "Generation failed",
            description: result.error,
          });
          return;
        }

        const { applied, failed } = applyAIResult(session, { commands: result.commands });
        if (applied > 0) {
          onDocumentChange();
        }

        const failedSummary =
          failed.length > 0
            ? `${failed.length} command(s) failed: ${failed[0]?.message ?? "validation error"}`
            : undefined;

        if (applied === 0 && failed.length > 0) {
          toast({
            title: "Nothing applied",
            description: failedSummary,
          });
          return;
        }

        toast({
          title: applied > 0 ? "Generation applied" : "Generation complete",
          description:
            applied > 0
              ? `Applied ${applied} command(s).${failedSummary ? ` ${failedSummary}` : ""}`
              : failedSummary,
          action:
            applied > 0 ? (
              <ToastAction
                altText="Revert generation"
                onClick={() => {
                  onRevertSnapshot(preGenerationSnapshot);
                  onDocumentChange();
                }}
              >
                Revert generation
              </ToastAction>
            ) : undefined,
        });

        if (applied > 0) {
          setOpen(false);
          setPrompt("");
        }
      } catch {
        toast({
          title: "Error",
          description: "Could not generate page content.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
          aria-label="Generate with AI"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate section with AI</DialogTitle>
          <DialogDescription>
            Describe one section to append or refine. The model produces editable commands for a single
            section at a time — use Undo or Revert to roll back. Does not survive a page reload until Plan 18
            versioning lands.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder='e.g. "Add a services section with three tinted cards, each with an icon, heading, and short description"'
          maxLength={AI_RATE_LIMITS.maxPromptLength}
          rows={5}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          {prompt.length}/{AI_RATE_LIMITS.maxPromptLength} characters
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending || prompt.trim().length === 0}>
            {pending ? "Generating section…" : "Generate section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
