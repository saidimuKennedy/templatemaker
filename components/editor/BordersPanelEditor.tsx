"use client";

import { useId } from "react";
import type { BuilderNode } from "@/builder/document/types";
import { BORDER_STYLE_OPTIONS, expandBorderRadiusShorthand, type StyleField } from "@/builder/styles/fields";
import { BorderRadiusEditor } from "@/components/editor/BorderRadiusEditor";
import { DimensionField } from "@/components/editor/DimensionField";
import { SegmentBar, SegmentButton } from "@/components/editor/SegmentBar";
import { readStyleField, styleFieldValue } from "@/builder/styles/style-field";
import { defaultTokens } from "@/builder/styles/tokens";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, X } from "lucide-react";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function DashedLineIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 4" className={className} aria-hidden="true">
      <line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function DottedLineIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 4" className={className} aria-hidden="true">
      <line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 2" strokeLinecap="round" />
    </svg>
  );
}

const STYLE_ICONS = {
  none: X,
  solid: Minus,
  dashed: DashedLineIcon,
  dotted: DottedLineIcon,
} as const;

type BordersPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
  readonly onDeclarationPatch: (mutate: (draft: Record<string, string | number>) => void) => void;
};

export function BordersPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
  onDeclarationPatch,
}: BordersPanelEditorProps) {
  const colorInputId = useId();
  const radiusDeclaration = expandBorderRadiusShorthand(declaration);

  const read = (key: string) => readStyleField(node, breakpoint, registry, declaration, key);
  const style = read("borderStyle");
  const width = read("borderWidth");
  const color = read("borderColor");

  /*
   * The value in force, not a hardcoded "none": a border set on Mobile is still
   * in force on Tablet, and reading only this breakpoint's declaration showed
   * None as active on elements that had a visible border.
   */
  const styleValue = styleFieldValue(style, "none");
  const borderStyleField: StyleField = {
    key: "borderStyle",
    label: "Style",
    kind: "select",
    options: BORDER_STYLE_OPTIONS,
  };
  const colorText = color.authored !== undefined ? String(color.authored) : "";
  const colorPickerValue = isHexColor(colorText) ? colorText : "#000000";

  return (
    <div className="space-y-4">
      <BorderRadiusEditor
        node={node}
        breakpoint={breakpoint}
        registry={registry}
        declaration={radiusDeclaration}
        onPatch={onDeclarationPatch}
      />

      <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Borders</p>

        <SegmentBar
          label="Style"
          inherited={style.inherited}
          sourceLabel={style.sourceLabel}
          onClear={style.authored !== undefined ? () => onFieldChange(borderStyleField, "") : undefined}
        >
          {BORDER_STYLE_OPTIONS.map((option) => {
            const Icon = STYLE_ICONS[option.value as keyof typeof STYLE_ICONS];
            return (
              <SegmentButton
                key={option.value}
                title={option.label}
                active={styleValue === option.value}
                inherited={style.inherited}
                onClick={() => onFieldChange(borderStyleField, option.value)}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
              </SegmentButton>
            );
          })}
        </SegmentBar>

        <DimensionField
          spec={{ key: "borderWidth", label: "Width", defaultUnit: "px" }}
          authored={width.authored}
          placeholder={width.placeholder}
          inherited={width.inherited}
          onChange={(value) =>
            onFieldChange({ key: "borderWidth", label: "Width", kind: "dimension" }, value)
          }
        />

        <div className="space-y-1.5">
          <Label htmlFor={colorInputId} className="text-[11px] font-medium text-muted-foreground">
            Color
          </Label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
            <input
              type="color"
              value={colorPickerValue}
              aria-label="Border color swatch"
              className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
              onChange={(event) =>
                onFieldChange(
                  { key: "borderColor", label: "Color", kind: "color" },
                  event.target.value,
                )
              }
            />
            <Input
              id={colorInputId}
              type="text"
              className="h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              placeholder={color.placeholder ?? "#000000"}
              value={colorText}
              onChange={(event) =>
                onFieldChange(
                  { key: "borderColor", label: "Color", kind: "color" },
                  event.target.value,
                )
              }
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(defaultTokens.colors).map(([name, value]) => (
              <button
                key={name}
                type="button"
                title={name}
                className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() =>
                  onFieldChange({ key: "borderColor", label: "Color", kind: "color" }, value)
                }
              >
                <span
                  className="h-3 w-3 rounded-sm border border-border/60"
                  style={{ backgroundColor: value }}
                />
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
