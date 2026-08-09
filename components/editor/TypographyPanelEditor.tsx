"use client";

import { useId, useState, type ReactNode } from "react";
import type { BuilderNode } from "@/builder/document/types";
import {
  TEXT_ALIGN_OPTIONS,
  type StyleField,
} from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { DimensionField } from "@/components/editor/DimensionField";
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
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  CaseUpper,
  ChevronRight,
  Strikethrough,
  Underline,
  X,
} from "lucide-react";

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { label: "400 — Normal", value: "400" },
  { label: "500 — Medium", value: "500" },
  { label: "600 — Semi Bold", value: "600" },
  { label: "700 — Bold", value: "700" },
] as const;

const ALIGN_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
} as const;

function fieldValue(
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
  key: string,
): { authored?: string | number; placeholder?: string; inherited?: boolean } {
  const authored = declaration[key];
  if (authored !== undefined) {
    return { authored };
  }
  const effective = resolveEffectiveStyleField(node, breakpoint, key, registry);
  if (!effective || effective.source === "authored") {
    return {};
  }
  return {
    placeholder: String(effective.value),
    inherited: true,
  };
}

function SegmentBar({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {children}
      </div>
    </div>
  );
}

function SegmentButton({
  title,
  active,
  onClick,
  children,
}: {
  readonly title: string;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-[2.25rem] flex-1 items-center justify-center rounded transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type TypographyPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

export function TypographyPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: TypographyPanelEditorProps) {
  const [showMore, setShowMore] = useState(false);
  const [customFont, setCustomFont] = useState(false);

  const font = fieldValue(node, breakpoint, registry, declaration, "fontFamily");
  const fontAuthored = font.authored !== undefined ? String(font.authored) : "";
  const fontMatch = FONT_OPTIONS.find((option) => option.value === fontAuthored);

  const weight = fieldValue(node, breakpoint, registry, declaration, "fontWeight");
  const size = fieldValue(node, breakpoint, registry, declaration, "fontSize");
  const lineHeight = fieldValue(node, breakpoint, registry, declaration, "lineHeight");
  const color = fieldValue(node, breakpoint, registry, declaration, "color");
  const letterSpacing = fieldValue(node, breakpoint, registry, declaration, "letterSpacing");

  const textAlign = declaration.textAlign !== undefined ? String(declaration.textAlign) : "left";
  const textDecoration =
    declaration.textDecoration !== undefined ? String(declaration.textDecoration) : "none";
  const textTransform =
    declaration.textTransform !== undefined ? String(declaration.textTransform) : "none";

  const colorInputId = useId();
  const colorText = color.authored !== undefined ? String(color.authored) : "";
  const colorPickerValue = /^#[0-9a-fA-F]{6}$/.test(colorText) ? colorText : "#000000";

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-muted-foreground">Font</Label>
        {customFont || (fontAuthored && !fontMatch) ? (
          <div className="flex gap-1.5">
            <Input
              type="text"
              className="h-8 flex-1 text-xs"
              placeholder={font.placeholder ?? "Inter, system-ui, sans-serif"}
              value={fontAuthored}
              onChange={(event) =>
                onFieldChange({ key: "fontFamily", label: "Font", kind: "text" }, event.target.value)
              }
            />
            <button
              type="button"
              className="h-8 shrink-0 rounded border border-input px-2 text-[10px] text-muted-foreground hover:bg-muted"
              onClick={() => setCustomFont(false)}
            >
              Presets
            </button>
          </div>
        ) : (
          <Select
            value={fontMatch?.value}
            onValueChange={(value) => {
              if (value === "__custom__") {
                setCustomFont(true);
                return;
              }
              onFieldChange({ key: "fontFamily", label: "Font", kind: "text" }, value);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={font.placeholder ?? "Select font…"} />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom__" className="text-xs">
                Custom…
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-muted-foreground">Weight</Label>
        <Select
          value={weight.authored !== undefined ? String(weight.authored) : undefined}
          onValueChange={(value) =>
            onFieldChange({ key: "fontWeight", label: "Font weight", kind: "typography-weight" }, value)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={weight.placeholder ?? "400 — Normal"} />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        {/*
          A unit dropdown rather than a fixed PX suffix: `rem` is the common
          choice for type, and the old field appended px to whatever it found,
          turning an authored `1.5rem` into `1.5rempx` on the first keystroke.
        */}
        <DimensionField
          spec={{ key: "fontSize", label: "Size", defaultUnit: "px" }}
          authored={size.authored}
          placeholder={size.placeholder}
          inherited={size.inherited}
          onChange={(value) =>
            onFieldChange({ key: "fontSize", label: "Font size", kind: "typography-size" }, value)
          }
        />

        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Height</Label>
          <Input
            type="text"
            inputMode="decimal"
            className="h-8 text-xs"
            placeholder={lineHeight.placeholder ?? "1.5"}
            /*
              Shown and stored verbatim. Line height is the one length here that
              is usually unitless, so stripping `px` for display while writing
              the raw text back turned `24px` into the ratio `26` on edit.
            */
            value={lineHeight.authored !== undefined ? String(lineHeight.authored) : ""}
            onChange={(event) =>
              onFieldChange(
                { key: "lineHeight", label: "Line height", kind: "dimension" },
                event.target.value,
              )
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={colorInputId} className="text-[11px] font-medium text-muted-foreground">
          Color
        </Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
          <input
            type="color"
            value={colorPickerValue}
            aria-label="Text color swatch"
            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
            onChange={(event) =>
              onFieldChange({ key: "color", label: "Text color", kind: "color" }, event.target.value)
            }
          />
          <Input
            id={colorInputId}
            type="text"
            className="h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
            placeholder={color.placeholder ?? "#0f172a"}
            value={colorText}
            onChange={(event) =>
              onFieldChange({ key: "color", label: "Text color", kind: "color" }, event.target.value)
            }
          />
        </div>
      </div>

      <SegmentBar label="Align">
        {TEXT_ALIGN_OPTIONS.map((option) => {
          const Icon = ALIGN_ICONS[option.value as keyof typeof ALIGN_ICONS];
          return (
            <SegmentButton
              key={option.value}
              title={option.label}
              active={textAlign === option.value}
              onClick={() =>
                onFieldChange(
                  { key: "textAlign", label: "Text align", kind: "text-align" },
                  option.value,
                )
              }
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
            </SegmentButton>
          );
        })}
      </SegmentBar>

      <SegmentBar label="Decor">
        <SegmentButton
          title="None"
          active={textDecoration === "none" && textTransform === "none"}
          onClick={() => {
            onFieldChange({ key: "textDecoration", label: "Decoration", kind: "select" }, "none");
            onFieldChange({ key: "textTransform", label: "Transform", kind: "select" }, "none");
          }}
        >
          <X className="h-3.5 w-3.5" />
        </SegmentButton>
        <SegmentButton
          title="Line through"
          active={textDecoration === "line-through"}
          onClick={() =>
            onFieldChange(
              { key: "textDecoration", label: "Decoration", kind: "select" },
              textDecoration === "line-through" ? "none" : "line-through",
            )
          }
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </SegmentButton>
        <SegmentButton
          title="Underline"
          active={textDecoration === "underline"}
          onClick={() =>
            onFieldChange(
              { key: "textDecoration", label: "Decoration", kind: "select" },
              textDecoration === "underline" ? "none" : "underline",
            )
          }
        >
          <Underline className="h-3.5 w-3.5" />
        </SegmentButton>
        <SegmentButton
          title="Uppercase"
          active={textTransform === "uppercase"}
          onClick={() =>
            onFieldChange(
              { key: "textTransform", label: "Transform", kind: "select" },
              textTransform === "uppercase" ? "none" : "uppercase",
            )
          }
        >
          <CaseUpper className="h-3.5 w-3.5" />
        </SegmentButton>
      </SegmentBar>

      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40"
      >
        More type options
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showMore && "rotate-90")} />
      </button>

      {showMore ? (
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Letter spacing</Label>
          <Input
            type="text"
            className="h-8 text-xs"
            placeholder={letterSpacing.placeholder ?? "0px"}
            value={letterSpacing.authored !== undefined ? String(letterSpacing.authored) : ""}
            onChange={(event) =>
              onFieldChange(
                { key: "letterSpacing", label: "Letter spacing", kind: "dimension" },
                event.target.value,
              )
            }
          />
        </div>
      ) : null}
    </div>
  );
}
