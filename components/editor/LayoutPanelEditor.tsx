"use client";

import type { BuilderNode } from "@/builder/document/types";
import {
  ALIGN_OPTIONS,
  FLEX_DIRECTION_OPTIONS,
  FLEX_WRAP_OPTIONS,
  JUSTIFY_OPTIONS,
  DISPLAY_OPTIONS,
  OVERFLOW_DISPLAY_OPTIONS,
  PRIMARY_DISPLAY_OPTIONS,
  type StyleField,
} from "@/builder/styles/fields";
import { readStyleField, styleFieldValue } from "@/builder/styles/style-field";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { DimensionField } from "@/components/editor/DimensionField";
import { SegmentBar, SegmentButton } from "@/components/editor/SegmentBar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Baseline,
  ChevronDown,
  EyeOff,
  RotateCcw,
  StretchHorizontal,
  Type,
} from "lucide-react";


function isFlexDisplay(display: string): boolean {
  return display === "flex" || display === "inline-flex";
}

function isGridDisplay(display: string): boolean {
  return display === "grid" || display === "inline-grid";
}

function BlockIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FlexIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="2" y="3" width="4" height="10" rx="0.5" fill="currentColor" opacity="0.55" />
      <rect x="7" y="3" width="4" height="10" rx="0.5" fill="currentColor" opacity="0.55" />
      <rect x="12" y="3" width="2" height="10" rx="0.5" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function GridIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="9" y="2" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="2" y="9" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="9" y="9" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function InlineBlockIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="3" y="4" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <line x1="5" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function InlineFlexIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="2" y="5" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.55" />
      <rect x="6" y="5" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.55" />
      <line x1="11" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1" />
      <line x1="11" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function InlineGridIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="2" y="4" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="6" y="4" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="2" y="8" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="6" y="8" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="11" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1" />
      <line x1="11" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

const PRIMARY_DISPLAY_ICONS = {
  block: BlockIcon,
  flex: FlexIcon,
  grid: GridIcon,
} as const;

const OVERFLOW_DISPLAY_ICONS = {
  "inline-block": InlineBlockIcon,
  "inline-flex": InlineFlexIcon,
  "inline-grid": InlineGridIcon,
  inline: Type,
  none: EyeOff,
} as const;

const DIRECTION_ICONS = {
  row: () => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="2" y="6" width="12" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
      <path d="M12 8h2M13 7l1 1-1 1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  column: () => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="6" y="2" width="4" height="12" rx="0.5" fill="currentColor" opacity="0.5" />
      <path d="M8 12v2M7 13l1 1 1-1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  "row-reverse": () => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="2" y="6" width="12" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
      <path d="M4 8H2M3 7L2 8l1 1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  "column-reverse": () => (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="6" y="2" width="4" height="12" rx="0.5" fill="currentColor" opacity="0.5" />
      <path d="M8 4V2M7 3l1-1 1 1" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
} as const;

const JUSTIFY_ICONS = {
  "flex-start": AlignHorizontalJustifyStart,
  center: AlignHorizontalJustifyCenter,
  "flex-end": AlignHorizontalJustifyEnd,
  "space-between": AlignHorizontalSpaceBetween,
  "space-around": AlignHorizontalSpaceAround,
} as const;

const ALIGN_ICONS = {
  stretch: StretchHorizontal,
  "flex-start": AlignVerticalJustifyStart,
  center: AlignVerticalJustifyCenter,
  "flex-end": AlignVerticalJustifyEnd,
  baseline: Baseline,
} as const;

type LayoutPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

export function LayoutPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: LayoutPanelEditorProps) {
  const read = (key: string) => readStyleField(node, breakpoint, registry, declaration, key);

  const displayState = read("display");
  const display = styleFieldValue(displayState, "block");
  const overflowSelected = OVERFLOW_DISPLAY_OPTIONS.some((option) => option.value === display);

  const flexDirection = read("flexDirection");
  const justify = read("justifyContent");
  const align = read("alignItems");
  const wrap = read("flexWrap");
  const gap = read("gap");
  const gridColumns = read("gridTemplateColumns");

  const flexDirectionValue = styleFieldValue(flexDirection, "row");
  const justifyValue = styleFieldValue(justify, "flex-start");
  const alignValue = styleFieldValue(align, "stretch");
  const wrapValue = styleFieldValue(wrap, "nowrap");

  /*
   * Every option writes its own value, including the CSS default. Writing "" for
   * the default deleted the declaration, and since the control reads the
   * effective value, a component default or a smaller breakpoint put the old
   * value straight back — the button never latched. Clearing is the explicit
   * reset on each bar instead.
   */
  const set = (field: StyleField, value: string) => onFieldChange(field, value);
  const clear = (field: StyleField) => onFieldChange(field, "");

  const displayField: StyleField = {
    key: "display",
    label: "Display",
    kind: "select",
    options: DISPLAY_OPTIONS,
  };
  const directionField: StyleField = {
    key: "flexDirection",
    label: "Direction",
    kind: "select",
    options: FLEX_DIRECTION_OPTIONS,
  };
  const justifyField: StyleField = {
    key: "justifyContent",
    label: "Justify",
    kind: "select",
    options: JUSTIFY_OPTIONS,
  };
  const alignField: StyleField = {
    key: "alignItems",
    label: "Align",
    kind: "select",
    options: ALIGN_OPTIONS,
  };
  const wrapField: StyleField = {
    key: "flexWrap",
    label: "Wrap",
    kind: "select",
    options: FLEX_WRAP_OPTIONS,
  };
  const gapField: StyleField = { key: "gap", label: "Gap", kind: "spacing" };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-medium text-muted-foreground">Display</Label>
          {displayState.authored !== undefined ? (
            <button
              type="button"
              title="Clear display override"
              aria-label="Clear display override"
              onClick={() => clear(displayField)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
          {PRIMARY_DISPLAY_OPTIONS.map((option) => {
            const Icon = PRIMARY_DISPLAY_ICONS[option.value as keyof typeof PRIMARY_DISPLAY_ICONS];
            return (
              <SegmentButton
                key={option.value}
                title={option.label}
                active={display === option.value}
                inherited={displayState.inherited}
                onClick={() => set(displayField, option.value)}
                className="gap-1 px-2 text-[10px] font-medium"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[280px]:inline">{option.label}</span>
              </SegmentButton>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="More display options"
                aria-label="More display options"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors",
                  overflowSelected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              {OVERFLOW_DISPLAY_OPTIONS.map((option) => {
                const Icon =
                  OVERFLOW_DISPLAY_ICONS[option.value as keyof typeof OVERFLOW_DISPLAY_ICONS];
                return (
                  <DropdownMenuItem
                    key={option.value}
                    className={cn("gap-2 text-xs", display === option.value && "bg-muted")}
                    onClick={() => set(displayField, option.value)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {displayState.inherited && displayState.sourceLabel ? (
          <p className="text-[10px] italic leading-snug text-muted-foreground/80">
            {displayState.sourceLabel}
          </p>
        ) : null}
      </div>

      {isFlexDisplay(display) ? (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-2.5">
          <SegmentBar
            label="Direction"
            inherited={flexDirection.inherited}
            sourceLabel={flexDirection.sourceLabel}
            onClear={flexDirection.authored !== undefined ? () => clear(directionField) : undefined}
          >
            {FLEX_DIRECTION_OPTIONS.map((option) => {
              const Icon = DIRECTION_ICONS[option.value as keyof typeof DIRECTION_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={option.label}
                  active={flexDirectionValue === option.value}
                  inherited={flexDirection.inherited}
                  onClick={() => set(directionField, option.value)}
                >
                  <Icon />
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar
            label="Justify"
            inherited={justify.inherited}
            sourceLabel={justify.sourceLabel}
            onClear={justify.authored !== undefined ? () => clear(justifyField) : undefined}
          >
            {JUSTIFY_OPTIONS.map((option) => {
              const Icon = JUSTIFY_ICONS[option.value as keyof typeof JUSTIFY_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={`Justify ${option.label}`}
                  active={justifyValue === option.value}
                  inherited={justify.inherited}
                  onClick={() => set(justifyField, option.value)}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar
            label="Align items"
            inherited={align.inherited}
            sourceLabel={align.sourceLabel}
            onClear={align.authored !== undefined ? () => clear(alignField) : undefined}
          >
            {ALIGN_OPTIONS.map((option) => {
              const Icon = ALIGN_ICONS[option.value as keyof typeof ALIGN_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={`Align ${option.label}`}
                  active={alignValue === option.value}
                  inherited={align.inherited}
                  onClick={() => set(alignField, option.value)}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar
            label="Wrap"
            inherited={wrap.inherited}
            sourceLabel={wrap.sourceLabel}
            onClear={wrap.authored !== undefined ? () => clear(wrapField) : undefined}
          >
            {FLEX_WRAP_OPTIONS.map((option) => (
              <SegmentButton
                key={option.value}
                title={option.label}
                active={wrapValue === option.value}
                inherited={wrap.inherited}
                onClick={() => set(wrapField, option.value)}
              >
                <span className="text-[10px]">{option.label.replace(" wrap", "")}</span>
              </SegmentButton>
            ))}
          </SegmentBar>

          <DimensionField
            spec={{ key: "gap", label: "Gap", defaultUnit: "px" }}
            authored={gap.authored}
            placeholder={gap.placeholder}
            inherited={gap.inherited}
            onChange={(value) => onFieldChange(gapField, value)}
          />
        </div>
      ) : null}

      {isGridDisplay(display) ? (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Grid columns</Label>
            <Input
              type="text"
              className="h-8 text-xs"
              placeholder={
                gridColumns.placeholder ?? "repeat(auto-fit, minmax(240px, 1fr))"
              }
              value={gridColumns.authored !== undefined ? String(gridColumns.authored) : ""}
              onChange={(event) =>
                onFieldChange(
                  {
                    key: "gridTemplateColumns",
                    label: "Grid columns",
                    kind: "text",
                    hint: "e.g. 1fr 2fr",
                  },
                  event.target.value,
                )
              }
            />
          </div>
          <DimensionField
            spec={{ key: "gap", label: "Gap", defaultUnit: "px" }}
            authored={gap.authored}
            placeholder={gap.placeholder}
            inherited={gap.inherited}
            onChange={(value) => onFieldChange(gapField, value)}
          />
        </div>
      ) : null}
    </div>
  );
}
