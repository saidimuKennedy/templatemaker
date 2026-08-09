"use client";

import { useState } from "react";
import { findNodeAndParent } from "@/builder/document/tree";
import type { BuilderDocument, BuilderPage, NodeId, PageId } from "@/builder/document/types";
import {
  buildInspectorModel,
  createClearPropBindingCommand,
  createSetPropBindingCommand,
  createUpdatePropsCommand,
  validateFieldValue,
} from "@/builder/inspector";
import type { InspectorField } from "@/builder/inspector/types";
import type { Command } from "@/builder/history/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import type { Breakpoint } from "@/builder/styles/types";
import { isBinding } from "@/builder/bindings/types";
import { isBrokenPageLink } from "@/builder/pages/resolve-links";
import { StyleInspector } from "@/components/editor/StyleInspector";
import { InteractionsPanelEditor } from "@/components/editor/InteractionsPanelEditor";
import { ImageFieldControl } from "@/components/editor/ImageFieldControl";
import { PageFieldControl } from "@/components/editor/PageFieldControl";
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
  readonly selectedNodeIds: readonly NodeId[];
  readonly registry: ComponentRegistry;
  readonly viewport: Breakpoint;
  readonly onCommand: (command: Command) => void;
};

/**
 * A field's help text. Rendered from the registry's `description`, so the
 * explanation lives next to the property definition rather than here — a new
 * component gets its guidance for free.
 */
function FieldHint({ field }: { readonly field: InspectorField }) {
  if (!field.description) {
    return null;
  }
  return (
    <p id={`${field.key}-hint`} className="text-xs leading-snug text-muted-foreground">
      {field.description}
    </p>
  );
}

function BindingToggle({
  bound,
  onToggle,
}: {
  readonly bound: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={
        bound
          ? "shrink-0 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
          : "shrink-0 rounded border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      }
      onClick={onToggle}
    >
      {bound ? "Bound" : "Bind"}
    </button>
  );
}

function FieldControl({
  field,
  error,
  pages,
  brokenPageLink,
  bound,
  bindPath,
  onToggleBinding,
  onBindPathChange,
  onChange,
}: {
  readonly field: InspectorField;
  readonly error?: string;
  readonly pages: readonly BuilderPage[];
  readonly brokenPageLink?: boolean;
  readonly bound?: boolean;
  readonly bindPath?: string;
  readonly onToggleBinding?: () => void;
  readonly onBindPathChange?: (path: string) => void;
  readonly onChange: (value: unknown) => void;
}) {
  const invalid = Boolean(error);
  const describedBy = field.description ? `${field.key}-hint` : undefined;

  if (bound) {
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <Label htmlFor={field.key}>{field.label}</Label>
            <FieldHint field={field} />
          </div>
          <BindingToggle bound onToggle={onToggleBinding!} />
        </div>
        <Input
          id={field.key}
          type="text"
          value={bindPath ?? ""}
          placeholder="vars.myField"
          className="font-mono text-xs"
          aria-describedby={describedBy}
          onChange={(event) => onBindPathChange?.(event.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Resolved at runtime from scope.path. Click Bound to switch back to a literal value.
        </p>
      </div>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-1">
        <Label htmlFor={field.key}>{field.label}</Label>
        <FieldHint field={field} />
      </div>
      {onToggleBinding ? <BindingToggle bound={false} onToggle={onToggleBinding} /> : null}
    </div>
  );

  if (field.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor={field.key}>{field.label}</Label>
          <FieldHint field={field} />
        </div>
        <Switch
          id={field.key}
          checked={field.value === true}
          aria-describedby={describedBy}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        {header}
        <Select
          value={typeof field.value === "string" ? field.value : ""}
          onValueChange={(value) => onChange(value)}
        >
          <SelectTrigger id={field.key} aria-invalid={invalid} aria-describedby={describedBy}>
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
        {header}
        <Textarea
          id={field.key}
          value={typeof field.value === "string" ? field.value : ""}
          data-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-2">
        {header}
        <Input
          id={field.key}
          type="number"
          value={typeof field.value === "number" ? field.value : 0}
          data-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    );
  }

  if (field.type === "color") {
    const textValue = typeof field.value === "string" ? field.value : "";
    const pickerValue = /^#[0-9a-fA-F]{6}$/.test(textValue) ? textValue : "#000000";
    return (
      <div className="space-y-2">
        {header}
        <div className="flex items-center gap-2">
          <input
            id={`${field.key}-swatch`}
            type="color"
            value={pickerValue}
            aria-label={`${field.label} swatch`}
            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
            onChange={(event) => onChange(event.target.value)}
          />
          <Input
            id={field.key}
            type="text"
            value={textValue}
            placeholder="#000000, transparent, currentColor…"
            data-invalid={invalid}
            aria-describedby={describedBy}
            className="flex-1"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>
    );
  }

  if (field.type === "image") {
    const urlValue = typeof field.value === "string" ? field.value : "";
    return (
      <div className="space-y-2">
        {header}
        <ImageFieldControl
          fieldKey={field.key}
          label={field.label}
          description={field.description}
          value={urlValue}
          invalid={invalid}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "page") {
    const pageValue = typeof field.value === "string" ? field.value : "";
    return (
      <div className="space-y-2">
        {header}
        <PageFieldControl
          fieldKey={field.key}
          label={field.label}
          description={field.description}
          value={pageValue}
          pages={pages}
          invalid={invalid}
          broken={brokenPageLink}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      <Input
        id={field.key}
        type="text"
        value={typeof field.value === "string" ? field.value : ""}
        data-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Inspector({
  document,
  pageId,
  selectedNodeIds,
  registry,
  viewport,
  onCommand,
}: InspectorProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selectedNodeId = selectedNodeIds[0] ?? null;

  if (selectedNodeIds.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 border-l border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Properties
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Select a node to edit its properties.
        </div>
      </div>
    );
  }

  if (selectedNodeIds.length > 1) {
    return (
      <div className="flex flex-col h-full min-h-0 border-l border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Properties
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {selectedNodeIds.length} nodes selected. Select a single node to edit properties.
        </div>
      </div>
    );
  }

  if (!selectedNodeId) {
    return null;
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
  const linkType = found.node.props.linkType === "page" ? "page" : "url";
  const visibleFields =
    model?.fields.filter((field) => {
      if (field.key === "pageId") {
        return linkType === "page";
      }
      if (field.key === "href") {
        return linkType === "url";
      }
      return true;
    }) ?? [];
  const brokenPageLink = isBrokenPageLink(found.node, document.pages);

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

  const handleToggleBinding = (field: InspectorField) => {
    const raw = found.node.props[field.key];
    if (isBinding(raw)) {
      const fallback =
        raw.fallback ??
        definition?.propertySchema.find((entry) => entry.key === field.key)?.defaultValue ??
        "";
      onCommand(
        createClearPropBindingCommand(pageId, found.node.id, field.key, fallback),
      );
      return;
    }
    const literal = raw ?? field.value;
    onCommand(
      createSetPropBindingCommand(
        pageId,
        found.node.id,
        field.key,
        "vars.example",
        literal,
      ),
    );
  };

  const handleBindPathChange = (field: InspectorField, path: string) => {
    const raw = found.node.props[field.key];
    const fallback = isBinding(raw) ? raw.fallback : field.value;
    onCommand(
      createSetPropBindingCommand(pageId, found.node.id, field.key, path, fallback),
    );
  };

  const contentPanel = model ? (
    <div className="space-y-4">
      {model.componentDescription ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {model.componentDescription}
        </p>
      ) : null}
      {visibleFields.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          Nothing to fill in here — this component is shaped entirely by the{" "}
          <span className="font-medium text-foreground">Design</span> tab and by what you drop
          inside it.
        </p>
      ) : null}
      <div className="space-y-4">
        {visibleFields.map((field) => {
          const rawValue = found.node.props[field.key];
          const bound = isBinding(rawValue);
          return (
          <div key={field.key} className="space-y-1">
            <FieldControl
              field={field}
              error={fieldErrors[field.key]}
              pages={document.pages}
              brokenPageLink={field.key === "pageId" ? brokenPageLink : undefined}
              bound={bound}
              bindPath={bound ? rawValue.$bind : undefined}
              onToggleBinding={
                field.type === "boolean" || field.type === "page" || field.type === "image"
                  ? undefined
                  : () => handleToggleBinding(field)
              }
              onBindPathChange={
                bound ? (path) => handleBindPathChange(field, path) : undefined
              }
              onChange={(value) => handleFieldChange(field, value)}
            />
            {fieldErrors[field.key] ? (
              <p className="text-xs text-red-600">{fieldErrors[field.key]}</p>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
      Unknown component type &quot;{found.node.type}&quot; — no properties available.
    </div>
  );

  const Icon = definition?.icon;

  return (
    <div className="flex flex-col h-full min-h-0 border-l border-border bg-card">
      {/*
        The header names what you selected instead of repeating the panel's own
        title: with the canvas, navigator, and inspector all on screen, "which
        thing am I editing?" is the only question this row can usefully answer.
      */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {Icon ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
            <Icon />
          </span>
        ) : null}
        <h2 className="truncate text-sm font-medium">
          {found.node.name ?? model?.componentLabel ?? found.node.type}
        </h2>
        {found.node.name ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {model?.componentLabel ?? found.node.type}
          </span>
        ) : null}
      </div>
      <Tabs defaultValue="content" className="flex flex-col flex-1 min-h-0">
        <TabsList className="h-auto w-full shrink-0 justify-start gap-6 rounded-none border-b border-border bg-transparent px-3 pt-1">
          <TabsTrigger
            value="content"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1.5 text-sm font-normal text-muted-foreground shadow-none data-[state=active]:-mb-px data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Content
          </TabsTrigger>
          <TabsTrigger
            value="design"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1.5 text-sm font-normal text-muted-foreground shadow-none data-[state=active]:-mb-px data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Design
          </TabsTrigger>
          <TabsTrigger
            value="interactions"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 pt-1.5 text-sm font-normal text-muted-foreground shadow-none data-[state=active]:-mb-px data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Interactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-0 flex-1 overflow-y-auto p-4">
          {contentPanel}
        </TabsContent>
        <TabsContent value="design" className="mt-0 flex-1 min-h-0 overflow-hidden">
          <StyleInspector
            pageId={pageId}
            node={found.node}
            breakpoint={viewport}
            registry={registry}
            onCommand={onCommand}
          />
        </TabsContent>
        <TabsContent value="interactions" className="mt-0 flex-1 overflow-y-auto p-4">
          <InteractionsPanelEditor
            pageId={pageId}
            node={found.node}
            onCommand={onCommand}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
