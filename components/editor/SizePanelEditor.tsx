"use client";

import { type ComponentType } from "react";
import type { BuilderNode } from "@/builder/document/types";
import { OVERFLOW_OPTIONS, type StyleField } from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import {
  DimensionField,
  type DimensionFieldSpec,
} from "@/components/editor/DimensionField";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, MoveVertical } from "lucide-react";

type DimensionSpec = DimensionFieldSpec;

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
