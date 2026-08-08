"use client";

import { useState } from "react";
import {
  STYLE_GROUPS,
  TEXT_ALIGN_OPTIONS,
  expandSpacingShorthand,
  type StyleField,
  type StyleGroup,
} from "@/builder/styles/fields";
import {
  effectiveSourceLabel,
  resolveEffectiveStyleField,
  type EffectiveStyleField,
} from "@/builder/styles/effective";
import { defaultTokens } from "@/builder/styles/tokens";
import type { Breakpoint, NodeStyleRules } from "@/builder/styles/types";
import type { BuilderNode, PageId } from "@/builder/document/types";
import { createUpdateStylesCommand } from "@/builder/inspector/edit";
import type { Command } from "@/builder/history/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";

const CUSTOM_VALUE = "__custom__";

const FONT_WEIGHT_OPTIONS = [
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
];

function tokenOptionsFor(field: StyleField): readonly { label: string; value: string }[] {
  if (field.kind === "color") {
    return Object.entries(defaultTokens.colors).map(([name, value]) => ({
      label: name,
      value,
    }));
  }
  if (field.kind === "spacing") {
    return Object.entries(defaultTokens.spacing).map(([name, value]) => ({
      label: name,
      value,
    }));
  }
  if (field.kind === "typography-size") {
    return Object.entries(defaultTokens.typography).map(([name, entry]) => ({
      label: name,
      value: entry.fontSize,
    }));
  }
  if (field.kind === "typography-weight") {
    return FONT_WEIGHT_OPTIONS;
  }
  if (field.kind === "text-align") {
    return TEXT_ALIGN_OPTIONS;
  }
  return [];
}

const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  base: "Mobile",
  sm: "Small",
  md: "Tablet",
  lg: "Desktop",
};

function getDeclarationForBreakpoint(
  node: BuilderNode,
  breakpoint: Breakpoint,
): Record<string, string | number> {
  const rules = node.styles as NodeStyleRules;
  return { ...(rules[breakpoint] ?? {}) };
}

function formatEffectivePlaceholder(
  field: StyleField,
  effective: EffectiveStyleField,
): string {
  const raw = String(effective.value);
  if (field.kind === "select" && field.options) {
    const match = field.options.find((option) => option.value === raw);
    if (match) {
      return match.label;
    }
  }
  if (raw.length > 48) {
    return `${raw.slice(0, 45)}…`;
  }
  return raw;
}

function StyleFieldControl({
  field,
  value,
  effective,
  breakpoint,
  onChange,
}: {
  readonly field: StyleField;
  readonly value: string | number | undefined;
  readonly effective?: EffectiveStyleField;
  readonly breakpoint: Breakpoint;
  readonly onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const isAuthored = value !== undefined;
  const currentValue = isAuthored ? String(value) : "";
  const inherited = !isAuthored && effective && effective.source !== "authored";
  const placeholder = inherited
    ? formatEffectivePlaceholder(field, effective)
    : field.hint ?? undefined;
  const sourceHint =
    inherited && effective ? effectiveSourceLabel(effective.source, breakpoint) : undefined;

  if (field.kind === "select") {
    return (
      <div className="space-y-1">
        <Label htmlFor={`style-${field.key}`} className="text-xs text-muted-foreground font-medium">
          {field.label}
        </Label>
        <Select value={isAuthored ? currentValue : undefined} onValueChange={onChange}>
          <SelectTrigger
            id={`style-${field.key}`}
            className={`h-8 text-xs ${inherited ? "text-muted-foreground/70 italic" : ""}`}
          >
            <SelectValue placeholder={placeholder ?? "Default"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceHint ? (
          <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">{sourceHint}</p>
        ) : field.hint ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>
        ) : null}
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <div className="space-y-1">
        <Label htmlFor={`style-${field.key}`} className="text-xs text-muted-foreground font-medium">
          {field.label}
        </Label>
        <Input
          id={`style-${field.key}`}
          type="text"
          className={`h-8 text-xs ${inherited ? "placeholder:text-muted-foreground/70 placeholder:italic" : ""}`}
          placeholder={placeholder ?? "e.g. 1"}
          value={currentValue}
          onChange={(event) => onChange(event.target.value)}
        />
        {sourceHint ? (
          <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">{sourceHint}</p>
        ) : field.hint ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>
        ) : null}
      </div>
    );
  }

  if (field.kind === "text" || field.kind === "dimension") {
    return (
      <div className="space-y-1">
        <Label htmlFor={`style-${field.key}`} className="text-xs text-muted-foreground font-medium">
          {field.label}
        </Label>
        <Input
          id={`style-${field.key}`}
          type="text"
          className={`h-8 text-xs ${inherited ? "placeholder:text-muted-foreground/70 placeholder:italic" : ""}`}
          placeholder={placeholder ?? (field.kind === "dimension" ? "e.g. 320px, 100%" : "e.g. auto")}
          value={currentValue}
          onChange={(event) => onChange(event.target.value)}
        />
        {sourceHint ? (
          <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">{sourceHint}</p>
        ) : field.hint ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>
        ) : null}
      </div>
    );
  }

  const options = tokenOptionsFor(field);
  const matchesToken = options.some((option) => option.value === currentValue);
  const showCustomInput = customMode || (currentValue !== "" && !matchesToken);

  return (
    <div className="space-y-1">
      <Label htmlFor={`style-${field.key}`} className="text-xs text-muted-foreground font-medium">
        {field.label}
      </Label>
      {showCustomInput ? (
        <div className="flex gap-1.5">
          <Input
            id={`style-${field.key}`}
            type="text"
            className={`h-8 text-xs flex-1 ${inherited ? "placeholder:text-muted-foreground/70 placeholder:italic" : ""}`}
            placeholder={placeholder}
            value={currentValue}
            onChange={(event) => onChange(event.target.value)}
          />
          {options.length > 0 ? (
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className="h-8 px-2 text-[10px] text-muted-foreground border border-input rounded hover:bg-muted"
            >
              Tokens
            </button>
          ) : null}
        </div>
      ) : (
        <Select
          value={isAuthored ? currentValue : undefined}
          onValueChange={(next) => {
            if (next === CUSTOM_VALUE) {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            onChange(next);
          }}
        >
          <SelectTrigger
            id={`style-${field.key}`}
            className={`h-8 text-xs ${inherited ? "text-muted-foreground/70 italic" : ""}`}
          >
            <SelectValue placeholder={placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE} className="text-xs">Custom…</SelectItem>
          </SelectContent>
        </Select>
      )}
      {sourceHint ? (
        <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">{sourceHint}</p>
      ) : field.hint ? (
        <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>
      ) : null}
    </div>
  );
}

function StyleGroupSection({
  group,
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: {
  readonly group: StyleGroup;
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(group.defaultOpen);

  return (
    <div className="border-b border-border py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-foreground hover:text-primary transition-colors select-none"
      >
        <span>{group.label}</span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {isOpen ? (
        <div className="mt-2.5 space-y-3">
          {group.fields.map((field) => {
            const authored = declaration[field.key];
            const effective =
              authored === undefined
                ? resolveEffectiveStyleField(node, breakpoint, field.key, registry)
                : undefined;
            return (
              <StyleFieldControl
                key={field.key}
                field={field}
                value={authored}
                effective={effective}
                breakpoint={breakpoint}
                onChange={(val) => onFieldChange(field, val)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type StyleInspectorProps = {
  readonly pageId: PageId;
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly onCommand: (command: Command) => void;
};

export function StyleInspector({
  pageId,
  node,
  breakpoint,
  registry,
  onCommand,
}: StyleInspectorProps) {
  const declaration = getDeclarationForBreakpoint(node, breakpoint);

  const handleFieldChange = (field: StyleField, value: string) => {
    const nextDeclaration = expandSpacingShorthand({ ...declaration, [field.key]: value });
    onCommand(createUpdateStylesCommand(pageId, node, breakpoint, nextDeclaration));
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="p-3 border-b border-border bg-muted/20">
        <p className="text-[11px] text-muted-foreground leading-snug">
          Editing styles for <span className="font-semibold text-foreground">{BREAKPOINT_LABELS[breakpoint]}</span>.
          Blank fields show inherited or component-default values in italics — set a value here to override.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {STYLE_GROUPS.map((group) => (
          <StyleGroupSection
            key={group.id}
            group={group}
            node={node}
            breakpoint={breakpoint}
            registry={registry}
            declaration={declaration}
            onFieldChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
}
