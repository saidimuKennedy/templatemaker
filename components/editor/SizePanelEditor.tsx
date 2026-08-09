"use client";

import { useId, useMemo, type ComponentType } from "react";
import type { BuilderNode } from "@/builder/document/types";
import { OVERFLOW_OPTIONS, type StyleField } from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
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
import { cn } from "@/lib/utils";
import { Eye, EyeOff, MoveVertical } from "lucide-react";

type DimensionMode = "auto" | "none" | "value";

type ParsedDimension = {
  readonly mode: DimensionMode;
  readonly numeric: string;
  readonly unit: "px" | "%";
};

type DimensionSpec = {
  readonly key: string;
  readonly label: string;
  readonly allowAuto?: boolean;
  readonly allowNone?: boolean;
  readonly defaultUnit?: "px" | "%";
};

const PRIMARY_DIMENSIONS: readonly DimensionSpec[] = [
  { key: "width", label: "Width", allowAuto: true, defaultUnit: "%" },
  { key: "height", label: "Height", allowAuto: true, defaultUnit: "px" },
];

const MIN_DIMENSIONS: readonly DimensionSpec[] = [
  { key: "minWidth", label: "Min W", defaultUnit: "px" },
  { key: "minHeight", label: "Min H", defaultUnit: "px" },
];

const MAX_DIMENSIONS: readonly DimensionSpec[] = [
  { key: "maxWidth", label: "Max W", allowNone: true, defaultUnit: "px" },
  { key: "maxHeight", label: "Max H", allowNone: true, defaultUnit: "px" },
];

function parseDimension(
  raw: string | number | undefined,
  spec: DimensionSpec,
): ParsedDimension {
  if (raw === undefined || raw === "") {
    return { mode: "value", numeric: "", unit: spec.defaultUnit ?? "px" };
  }
  const text = String(raw).trim().toLowerCase();
  if (text === "auto" && spec.allowAuto) {
    return { mode: "auto", numeric: "", unit: spec.defaultUnit ?? "px" };
  }
  if (text === "none" && spec.allowNone) {
    return { mode: "none", numeric: "", unit: spec.defaultUnit ?? "px" };
  }
  if (text.endsWith("%")) {
    return { mode: "value", numeric: text.slice(0, -1), unit: "%" };
  }
  if (text.endsWith("px")) {
    return { mode: "value", numeric: text.slice(0, -2), unit: "px" };
  }
  const numeric = Number.parseFloat(text);
  if (!Number.isNaN(numeric)) {
    return { mode: "value", numeric: String(numeric), unit: spec.defaultUnit ?? "px" };
  }
  return { mode: "value", numeric: text, unit: spec.defaultUnit ?? "px" };
}

function serializeDimension(parsed: ParsedDimension, spec: DimensionSpec): string {
  if (parsed.mode === "auto" && spec.allowAuto) {
    return "auto";
  }
  if (parsed.mode === "none" && spec.allowNone) {
    return "none";
  }
  const numeric = parsed.numeric.trim();
  if (!numeric) {
    return "";
  }
  return parsed.unit === "%" ? `${numeric}%` : `${numeric}px`;
}

function DimensionField({
  spec,
  authored,
  placeholder,
  inherited,
  onChange,
}: {
  readonly spec: DimensionSpec;
  readonly authored: string | number | undefined;
  readonly placeholder?: string;
  readonly inherited?: boolean;
  readonly onChange: (value: string) => void;
}) {
  const inputId = useId();
  const parsed = useMemo(() => parseDimension(authored, spec), [authored, spec]);

  const unitOptions: readonly { label: string; value: string }[] = [
    ...(spec.allowAuto ? [{ label: "Auto", value: "auto" }] : []),
    ...(spec.allowNone ? [{ label: "None", value: "none" }] : []),
    { label: "%", value: "%" },
    { label: "PX", value: "px" },
  ];

  const selectValue =
    parsed.mode === "auto"
      ? "auto"
      : parsed.mode === "none"
        ? "none"
        : parsed.unit;

  const handleUnitChange = (next: string) => {
    if (next === "auto" && spec.allowAuto) {
      onChange("auto");
      return;
    }
    if (next === "none" && spec.allowNone) {
      onChange("none");
      return;
    }
    const unit = next === "%" ? "%" : "px";
    const numeric = parsed.numeric || "0";
    onChange(serializeDimension({ mode: "value", numeric, unit }, spec));
  };

  const handleNumericChange = (next: string) => {
    onChange(serializeDimension({ mode: "value", numeric: next, unit: parsed.unit }, spec));
  };

  const displayValue =
    parsed.mode === "auto"
      ? "Auto"
      : parsed.mode === "none"
        ? "None"
        : parsed.numeric;

  const isKeyword = parsed.mode === "auto" || parsed.mode === "none";

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-[11px] font-medium text-muted-foreground">
        {spec.label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={inputId}
          type="text"
          inputMode={isKeyword ? "text" : "decimal"}
          readOnly={isKeyword}
          value={authored !== undefined ? displayValue : ""}
          placeholder={inherited ? placeholder : isKeyword ? undefined : "0"}
          onChange={(event) => handleNumericChange(event.target.value)}
          className={cn(
            "h-8 min-w-0 flex-1 text-xs",
            inherited && "placeholder:text-muted-foreground/70 placeholder:italic",
            isKeyword && "text-muted-foreground",
          )}
        />
        <Select value={selectValue} onValueChange={handleUnitChange}>
          <SelectTrigger className="h-8 w-[3.25rem] shrink-0 px-1.5 text-[10px] font-medium uppercase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const OVERFLOW_ICONS: Record<
  string,
  { readonly icon: ComponentType<{ className?: string }>; readonly label: string }
> = {
  visible: { icon: Eye, label: "Visible" },
  hidden: { icon: EyeOff, label: "Hidden" },
  scroll: { icon: MoveVertical, label: "Scroll" },
};

function OverflowControl({
  value,
  onChange,
}: {
  readonly value: string | undefined;
  readonly onChange: (value: string) => void;
}) {
  const current = value ?? "visible";

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">Overflow</Label>
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {OVERFLOW_OPTIONS.map((option) => {
          if (option.value === "auto") {
            return (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={current === option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex h-7 min-w-[2.25rem] flex-1 items-center justify-center rounded px-2 text-[10px] font-medium transition-colors",
                  current === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Auto
              </button>
            );
          }
          const entry = OVERFLOW_ICONS[option.value];
          const Icon = entry?.icon;
          return (
            <button
              key={option.value}
              type="button"
              title={entry?.label ?? option.label}
              aria-label={entry?.label ?? option.label}
              aria-pressed={current === option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-7 min-w-[2.25rem] flex-1 items-center justify-center rounded transition-colors",
                current === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SizePanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

function renderDimension(
  spec: DimensionSpec,
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
  onFieldChange: (field: StyleField, value: string) => void,
) {
  const authored = declaration[spec.key];
  const effective =
    authored === undefined
      ? resolveEffectiveStyleField(node, breakpoint, spec.key, registry)
      : undefined;
  const inherited = effective && effective.source !== "authored";
  const placeholder = inherited ? String(effective.value) : undefined;

  return (
    <DimensionField
      key={spec.key}
      spec={spec}
      authored={authored}
      placeholder={placeholder}
      inherited={inherited}
      onChange={(value) =>
        onFieldChange({ key: spec.key, label: spec.label, kind: "dimension" }, value)
      }
    />
  );
}

export function SizePanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: SizePanelEditorProps) {
  const overflowValue =
    declaration.overflow !== undefined ? String(declaration.overflow) : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {PRIMARY_DIMENSIONS.map((spec) =>
          renderDimension(spec, node, breakpoint, registry, declaration, onFieldChange),
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {MIN_DIMENSIONS.map((spec) =>
          renderDimension(spec, node, breakpoint, registry, declaration, onFieldChange),
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {MAX_DIMENSIONS.map((spec) =>
          renderDimension(spec, node, breakpoint, registry, declaration, onFieldChange),
        )}
      </div>
      <OverflowControl
        value={overflowValue}
        onChange={(value) =>
          onFieldChange(
            { key: "overflow", label: "Overflow", kind: "select", options: OVERFLOW_OPTIONS },
            value,
          )
        }
      />
    </div>
  );
}
