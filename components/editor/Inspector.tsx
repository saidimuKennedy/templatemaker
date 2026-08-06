"use client";

import { useState } from "react";
import { findNodeAndParent } from "@/builder/document/tree";
import type { BuilderDocument, NodeId, PageId } from "@/builder/document/types";
import {
  buildInspectorModel,
  createUpdatePropsCommand,
  validateFieldValue,
} from "@/builder/inspector";
import type { InspectorField } from "@/builder/inspector/types";
import type { Command } from "@/builder/history/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import type { Breakpoint } from "@/builder/styles/types";
import { StyleInspector } from "@/components/editor/StyleInspector";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type InspectorProps = {
  readonly document: BuilderDocument;
  readonly pageId: PageId;
  readonly selectedNodeId: NodeId | null;
  readonly registry: ComponentRegistry;
  readonly viewport: Breakpoint;
  readonly onCommand: (command: Command) => void;
};

function FieldControl({
  field,
  error,
  onChange,
}: {
  readonly field: InspectorField;
  readonly error?: string;
  readonly onChange: (value: unknown) => void;
}) {
  const invalid = Boolean(error);

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Switch
          id={field.key}
          checked={field.value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Select
          value={typeof field.value === "string" ? field.value : ""}
          onValueChange={(value) => onChange(value)}
        >
          <SelectTrigger id={field.key} aria-invalid={invalid}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "richtext") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Textarea
          id={field.key}
          value={typeof field.value === "string" ? field.value : ""}
          data-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          type="number"
          value={typeof field.value === "number" ? field.value : 0}
          data-invalid={invalid}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
        type="text"
        value={typeof field.value === "string" ? field.value : ""}
        data-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Inspector({
  document,
  pageId,
  selectedNodeId,
  registry,
  viewport,
  onCommand,
}: InspectorProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Select a node to edit its properties.
      </div>
    );
  }

  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return null;
  }

  const found = findNodeAndParent(page.root, selectedNodeId);
  if (!found) {
    return null;
  }

  const model = buildInspectorModel(found.node, registry);
  const definition = registry.get(found.node.type);

  const handleFieldChange = (field: InspectorField, value: unknown) => {
    const schemaField = definition?.propertySchema.find((entry) => entry.key === field.key);
    if (!schemaField) {
      return;
    }

    const error = validateFieldValue(schemaField, value);
    if (error) {
      setFieldErrors((current) => ({ ...current, [field.key]: error }));
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });
    onCommand(createUpdatePropsCommand(pageId, found.node, field.key, value));
  };

  const contentPanel = model ? (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Component</p>
        <p className="font-medium">{model.componentType}</p>
      </div>
      <div className="space-y-4">
        {model.fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <FieldControl
              field={field}
              error={fieldErrors[field.key]}
              onChange={(value) => handleFieldChange(field, value)}
            />
            {fieldErrors[field.key] ? (
              <p className="text-xs text-red-600">{fieldErrors[field.key]}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
      Unknown component type &quot;{found.node.type}&quot; — no properties available.
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border border-border p-4">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-4">
          {contentPanel}
        </TabsContent>
        <TabsContent value="design" className="mt-4">
          <StyleInspector pageId={pageId} node={found.node} breakpoint={viewport} onCommand={onCommand} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
