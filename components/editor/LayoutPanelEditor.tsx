"use client";

import { type ReactNode } from "react";
import type { BuilderNode } from "@/builder/document/types";
import {
  ALIGN_OPTIONS,
  FLEX_DIRECTION_OPTIONS,
  FLEX_WRAP_OPTIONS,
  JUSTIFY_OPTIONS,
  OVERFLOW_DISPLAY_OPTIONS,
  PRIMARY_DISPLAY_OPTIONS,
  type StyleField,
} from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { DimensionField } from "@/components/editor/DimensionField";
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
  StretchHorizontal,
  Type,
} from "lucide-react";

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

function resolveDisplay(
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
): string {
  const authored = declaration.display;
  if (authored !== undefined) {
    return String(authored);
  }
  const effective = resolveEffectiveStyleField(node, breakpoint, "display", registry);
  return effective ? String(effective.value) : "block";
}

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
  className,
}: {
  readonly title: string;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly className?: string;
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
        className,
      )}
    >
      {children}
    </button>
  );
}

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
  const display = resolveDisplay(node, breakpoint, registry, declaration);
  const overflowSelected = OVERFLOW_DISPLAY_OPTIONS.some((option) => option.value === display);

  const flexDirection = fieldValue(node, breakpoint, registry, declaration, "flexDirection");
  const justify = fieldValue(node, breakpoint, registry, declaration, "justifyContent");
  const align = fieldValue(node, breakpoint, registry, declaration, "alignItems");
  const wrap = fieldValue(node, breakpoint, registry, declaration, "flexWrap");
  const gap = fieldValue(node, breakpoint, registry, declaration, "gap");
  const gridColumns = fieldValue(node, breakpoint, registry, declaration, "gridTemplateColumns");

  const flexDirectionValue =
    flexDirection.authored !== undefined
      ? String(flexDirection.authored)
      : flexDirection.placeholder ?? "row";
  const justifyValue =
    justify.authored !== undefined ? String(justify.authored) : justify.placeholder ?? "flex-start";
  const alignValue =
    align.authored !== undefined ? String(align.authored) : align.placeholder ?? "stretch";
  const wrapValue =
    wrap.authored !== undefined ? String(wrap.authored) : wrap.placeholder ?? "nowrap";

  const setDisplay = (value: string) => {
    onFieldChange(
      { key: "display", label: "Display", kind: "select", options: PRIMARY_DISPLAY_OPTIONS },
      value === "block" ? "" : value,
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">Display</Label>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
          {PRIMARY_DISPLAY_OPTIONS.map((option) => {
            const Icon = PRIMARY_DISPLAY_ICONS[option.value as keyof typeof PRIMARY_DISPLAY_ICONS];
            return (
              <SegmentButton
                key={option.value}
                title={option.label}
                active={display === option.value}
                onClick={() => setDisplay(option.value)}
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
                    onClick={() => setDisplay(option.value)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isFlexDisplay(display) ? (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-2.5">
          <SegmentBar label="Direction">
            {FLEX_DIRECTION_OPTIONS.map((option) => {
              const Icon = DIRECTION_ICONS[option.value as keyof typeof DIRECTION_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={option.label}
                  active={flexDirectionValue === option.value}
                  onClick={() =>
                    onFieldChange(
                      {
                        key: "flexDirection",
                        label: "Direction",
                        kind: "select",
                        options: FLEX_DIRECTION_OPTIONS,
                      },
                      option.value === "row" ? "" : option.value,
                    )
                  }
                >
                  <Icon />
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar label="Justify">
            {JUSTIFY_OPTIONS.map((option) => {
              const Icon = JUSTIFY_ICONS[option.value as keyof typeof JUSTIFY_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={`Justify ${option.label}`}
                  active={justifyValue === option.value}
                  onClick={() =>
                    onFieldChange(
                      {
                        key: "justifyContent",
                        label: "Justify",
                        kind: "select",
                        options: JUSTIFY_OPTIONS,
                      },
                      option.value === "flex-start" ? "" : option.value,
                    )
                  }
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar label="Align items">
            {ALIGN_OPTIONS.map((option) => {
              const Icon = ALIGN_ICONS[option.value as keyof typeof ALIGN_ICONS];
              return (
                <SegmentButton
                  key={option.value}
                  title={`Align ${option.label}`}
                  active={alignValue === option.value}
                  onClick={() =>
                    onFieldChange(
                      {
                        key: "alignItems",
                        label: "Align",
                        kind: "select",
                        options: ALIGN_OPTIONS,
                      },
                      option.value === "stretch" ? "" : option.value,
                    )
                  }
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : option.label}
                </SegmentButton>
              );
            })}
          </SegmentBar>

          <SegmentBar label="Wrap">
            {FLEX_WRAP_OPTIONS.map((option) => (
              <SegmentButton
                key={option.value}
                title={option.label}
                active={wrapValue === option.value}
                onClick={() =>
                  onFieldChange(
                    {
                      key: "flexWrap",
                      label: "Wrap",
                      kind: "select",
                      options: FLEX_WRAP_OPTIONS,
                    },
                    option.value === "nowrap" ? "" : option.value,
                  )
                }
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
            onChange={(value) =>
              onFieldChange({ key: "gap", label: "Gap", kind: "spacing" }, value)
            }
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
            onChange={(value) =>
              onFieldChange({ key: "gap", label: "Gap", kind: "spacing" }, value)
            }
          />
        </div>
      ) : null}
    </div>
  );
}
