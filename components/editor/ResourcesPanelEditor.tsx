"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_RESOURCE_PERMISSIONS,
  RESOURCE_FIELD_TYPES,
  type ResourceDefinition,
  type ResourceField,
  type ResourceFieldType,
} from "@/builder/resources/types";
import type { BuilderDocument } from "@/builder/document/types";
import type { Command } from "@/builder/history/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { RESOURCES_DATA_TAB_DOC_PATH } from "@/lib/dev-docs/constants";

type ResourcesPanelEditorProps = {
  readonly document: BuilderDocument;
  readonly onCommand: (command: Command) => void;
};

function emptyField(): ResourceField {
  return { name: "field", type: "string", required: false };
}

function emptyResource(): ResourceDefinition {
  return {
    name: "messages",
    label: "Messages",
    fields: [emptyField()],
    permissions: { ...DEFAULT_RESOURCE_PERMISSIONS },
  };
}

export function ResourcesPanelEditor({ document, onCommand }: ResourcesPanelEditorProps) {
  const resources = document.resources ?? [];
  const [draft, setDraft] = useState<ResourceDefinition | null>(null);

  const startCreate = () => {
    setDraft(emptyResource());
  };

  const startEdit = (resource: ResourceDefinition) => {
    setDraft(structuredClone(resource));
  };

  const commitDraft = () => {
    if (!draft || !draft.name.trim() || draft.fields.length === 0) {
      return;
    }
    onCommand({ type: "UpsertResource", payload: { resource: draft } });
    setDraft(null);
  };

  const deleteResource = (name: string) => {
    onCommand({ type: "DeleteResource", payload: { name } });
    if (draft?.name === name) {
      setDraft(null);
    }
  };

  const updateDraftField = (index: number, patch: Partial<ResourceField>) => {
    if (!draft) {
      return;
    }
    const fields = draft.fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    );
    setDraft({ ...draft, fields });
  };

  const addField = () => {
    if (!draft) {
      return;
    }
    setDraft({ ...draft, fields: [...draft.fields, emptyField()] });
  };

  const removeField = (index: number) => {
    if (!draft || draft.fields.length <= 1) {
      return;
    }
    setDraft({ ...draft, fields: draft.fields.filter((_, fieldIndex) => fieldIndex !== index) });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resources
        </h2>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={startCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="editor-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {resources.length === 0 && !draft ? (
          <p className="text-xs text-muted-foreground">
            Define data tables for forms and bindings. Records are stored when the site is
            published.
          </p>
        ) : null}

        {resources.map((resource) => (
          <div
            key={resource.name}
            className="rounded-md border border-border bg-background p-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="text-left font-medium hover:underline"
                onClick={() => startEdit(resource)}
              >
                {resource.label ?? resource.name}
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 w-6 shrink-0 p-0"
                onClick={() => deleteResource(resource.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-1 text-muted-foreground">
              {resource.fields.length} field{resource.fields.length === 1 ? "" : "s"} · API:{" "}
              <code className="text-[10px]">/api/records/{resource.name}</code>
            </p>
          </div>
        ))}

        {draft ? (
          <div className="space-y-3 rounded-md border border-primary/30 bg-background p-3">
            <div className="space-y-1.5">
              <Label htmlFor="resource-name">Name (slug)</Label>
              <Input
                id="resource-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="messages"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-label">Label</Label>
              <Input
                id="resource-label"
                value={draft.label ?? ""}
                onChange={(event) => setDraft({ ...draft, label: event.target.value || undefined })}
                placeholder="Messages"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7" onClick={addField}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Field
                </Button>
              </div>
              {draft.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <Input
                    value={field.name}
                    onChange={(event) => updateDraftField(index, { name: event.target.value })}
                    placeholder="field_name"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      updateDraftField(index, { type: value as ResourceFieldType })
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={field.required ?? false}
                      onCheckedChange={(checked) => updateDraftField(index, { required: checked })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={draft.fields.length <= 1}
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resource-honeypot">Honeypot field (optional)</Label>
              <Select
                value={draft.honeypot ?? "__none__"}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    honeypot: value === "__none__" ? undefined : value,
                  })
                }
              >
                <SelectTrigger id="resource-honeypot">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {draft.fields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="resource-public-read">Public read access</Label>
                <Switch
                  id="resource-public-read"
                  checked={(draft.permissions?.read ?? DEFAULT_RESOURCE_PERMISSIONS.read) === "public"}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      permissions: {
                        ...DEFAULT_RESOURCE_PERMISSIONS,
                        ...draft.permissions,
                        read: checked ? "public" : "none",
                      },
                    })
                  }
                />
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground">
                When enabled, anyone can list all records via{" "}
                <code className="text-[10px]">GET /api/records/{draft.name || "…"}</code>.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={commitDraft}>
                Save resource
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">Need help?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <Link
            href={RESOURCES_DATA_TAB_DOC_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Resources &amp; Data tab guide
          </Link>
        </p>
      </div>
    </div>
  );
}
