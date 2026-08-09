"use client";

import { useId, useState, type ReactNode } from "react";
import type { BuilderNode } from "@/builder/document/types";
import {
  parseBlurAmount,
  parseBoxShadow,
  parseBoxShadows,
  parseOpacityPercent,
  parseOutline,
  parseTransformMove,
  parseTransition,
  serializeBoxShadow,
  serializeBoxShadows,
  serializeOpacityPercent,
  serializeOutline,
  serializeTransition,
  summarizeBoxShadow,
  summarizeTransformMove,
  upsertBlur,
  upsertTransformMove,
  type ParsedBoxShadow,
  type ParsedTransition,
} from "@/builder/styles/effects";
import {
  BLEND_MODE_OPTIONS,
  CURSOR_OPTIONS,
  POINTER_EVENTS_OPTIONS,
  type StyleField,
} from "@/builder/styles/fields";
import { readStyleField } from "@/builder/styles/style-field";
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
import { Minus, MousePointer2, Plus, X } from "lucide-react";

/** Select sentinel that clears an authored value; Radix forbids "". */
const CLEAR_VALUE = "__default__";

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
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

const OUTLINE_ICONS = {
  none: X,
  solid: Minus,
  dashed: DashedLineIcon,
  dotted: DottedLineIcon,
} as const;

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  unit = "PX",
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
  readonly unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-8 shrink-0 text-[11px] text-muted-foreground">{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={Math.min(Math.max(value, min), max)}
        className="h-1.5 min-w-0 flex-1 accent-primary"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="flex items-center gap-0.5">
        <Input
          type="text"
          inputMode="decimal"
          className="h-7 w-11 px-1 text-center text-xs tabular-nums"
          value={String(value)}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            onChange(Number.isNaN(next) ? 0 : next);
          }}
        />
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function AddableRow({
  label,
  summary,
  active,
  onAdd,
  onRemove,
  onToggle,
  children,
}: {
  readonly label: string;
  readonly summary?: string;
  readonly active: boolean;
  readonly onAdd: () => void;
  readonly onRemove: () => void;
  readonly onToggle: () => void;
  readonly children?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {summary ? (
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Add ${label.toLowerCase()}`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {summary ? (
        <>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
              active
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border bg-muted/20 hover:bg-muted/40",
            )}
            onClick={onToggle}
          >
            <span className="truncate">{summary}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{active ? "Close" : "Edit"}</span>
          </button>
          {active ? (
            <div className="space-y-3 rounded-md border border-border/80 bg-muted/15 p-3">{children}</div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

type EffectsPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

export function EffectsPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: EffectsPanelEditorProps) {
  const colorInputId = useId();

  const blend = readStyleField(node, breakpoint, registry, declaration, "mixBlendMode");
  const opacity = readStyleField(node, breakpoint, registry, declaration, "opacity");
  const outlineRaw = readStyleField(node, breakpoint, registry, declaration, "outline");
  const boxShadowRaw = readStyleField(node, breakpoint, registry, declaration, "boxShadow");
  const transformRaw = readStyleField(node, breakpoint, registry, declaration, "transform");
  const transitionRaw = readStyleField(node, breakpoint, registry, declaration, "transition");
  const filterRaw = readStyleField(node, breakpoint, registry, declaration, "filter");
  const backdropRaw = readStyleField(node, breakpoint, registry, declaration, "backdropFilter");
  const cursor = readStyleField(node, breakpoint, registry, declaration, "cursor");
  const pointerEvents = readStyleField(node, breakpoint, registry, declaration, "pointerEvents");

  const opacityPercent = parseOpacityPercent(opacity.authored ?? opacity.placeholder);
  const outline = parseOutline(
    outlineRaw.authored !== undefined ? String(outlineRaw.authored) : outlineRaw.placeholder,
  );
  const boxShadowText =
    boxShadowRaw.authored !== undefined ? String(boxShadowRaw.authored) : "";
  const shadows = parseBoxShadows(boxShadowText);
  const shadow = shadows[0] ?? parseBoxShadow("0px 2px 5px 0px rgba(0, 0, 0, 0.2)")!;

  const transformText =
    transformRaw.authored !== undefined ? String(transformRaw.authored) : "";
  const move = parseTransformMove(transformText);

  const transitionText =
    transitionRaw.authored !== undefined ? String(transitionRaw.authored) : "";
  const transition = parseTransition(transitionText) ?? {
    property: "all",
    durationMs: 200,
    easing: "ease",
  };

  const filterText = filterRaw.authored !== undefined ? String(filterRaw.authored) : "";
  const filterBlur = parseBlurAmount(filterText) ?? 0;

  const backdropText = backdropRaw.authored !== undefined ? String(backdropRaw.authored) : "";
  const backdropBlur = parseBlurAmount(backdropText) ?? 0;

  const [editingShadow, setEditingShadow] = useState(shadows.length > 0);
  const [editingTransform, setEditingTransform] = useState(transformText.trim().length > 0);
  const [editingTransition, setEditingTransition] = useState(transitionText.trim().length > 0);
  const [editingFilter, setEditingFilter] = useState(filterText.trim().length > 0);
  const [editingBackdrop, setEditingBackdrop] = useState(backdropText.trim().length > 0);

  /*
   * Only the first shadow has controls, so the rest are carried through
   * untouched. Serializing just the edited one silently deleted every
   * additional comma-separated shadow on the node.
   */
  const updateShadow = (next: ParsedBoxShadow) => {
    onFieldChange(
      { key: "boxShadow", label: "Box shadow", kind: "text" },
      serializeBoxShadows([next, ...shadows.slice(1)]),
    );
  };

  const updateMove = (axis: "x" | "y" | "z", value: number) => {
    const nextMove = { ...move, [axis]: value };
    onFieldChange(
      { key: "transform", label: "Transform", kind: "text" },
      upsertTransformMove(transformText, nextMove),
    );
  };

  const updateTransition = (next: ParsedTransition) => {
    onFieldChange(
      { key: "transition", label: "Transition", kind: "text" },
      serializeTransition(next),
    );
  };

  const shadowUnit = (shadow.unit || "px").toUpperCase();
  const outlineColorText = outline.color;
  const outlineColorPicker = isHexColor(outlineColorText) ? outlineColorText : "#2563eb";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-muted-foreground">Blending</Label>
        <Select
          value={blend.authored !== undefined ? String(blend.authored) : undefined}
          onValueChange={(value) =>
            onFieldChange(
              {
                key: "mixBlendMode",
                label: "Blending",
                kind: "select",
                options: BLEND_MODE_OPTIONS,
              },
              value === CLEAR_VALUE ? "" : value,
            )
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={blend.placeholder ?? "Normal"} />
          </SelectTrigger>
          <SelectContent>
            {/* Writing "" for Normal deleted the declaration, so an inherited
                blend mode could not be overridden back to normal. */}
            <SelectItem value={CLEAR_VALUE} className="text-xs text-muted-foreground">
              Default
            </SelectItem>
            {BLEND_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">Opacity</Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacityPercent}
            className="h-1.5 min-w-0 flex-1 accent-primary"
            onChange={(event) =>
              onFieldChange(
                { key: "opacity", label: "Opacity", kind: "number" },
                serializeOpacityPercent(Number(event.target.value)),
              )
            }
          />
          <div className="flex items-center gap-0.5">
            <Input
              type="text"
              inputMode="decimal"
              className="h-7 w-12 px-1 text-center text-xs tabular-nums"
              value={String(opacityPercent)}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                onFieldChange(
                  { key: "opacity", label: "Opacity", kind: "number" },
                  serializeOpacityPercent(Number.isNaN(next) ? 100 : next),
                );
              }}
            />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <SegmentBar label="Outline">
        {(["none", "solid", "dashed", "dotted"] as const).map((style) => {
          const Icon = OUTLINE_ICONS[style];
          return (
            <SegmentButton
              key={style}
              title={style}
              active={outline.style === style}
              onClick={() =>
                onFieldChange(
                  { key: "outline", label: "Outline", kind: "text" },
                  serializeOutline({ ...outline, style }),
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
            </SegmentButton>
          );
        })}
      </SegmentBar>

      {outline.style !== "none" ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-2.5">
          <SliderRow
            label="Width"
            value={outline.width}
            min={0}
            max={16}
            onChange={(width) =>
              onFieldChange(
                { key: "outline", label: "Outline", kind: "text" },
                serializeOutline({ ...outline, width }),
              )
            }
          />
          <div className="space-y-1.5">
            <Label htmlFor={colorInputId} className="text-[11px] font-medium text-muted-foreground">
              Color
            </Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
              <input
                type="color"
                value={outlineColorPicker}
                aria-label="Outline color swatch"
                className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                onChange={(event) =>
                  onFieldChange(
                    { key: "outline", label: "Outline", kind: "text" },
                    serializeOutline({ ...outline, color: event.target.value }),
                  )
                }
              />
              <Input
                id={colorInputId}
                type="text"
                className="h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                value={outlineColorText}
                onChange={(event) =>
                  onFieldChange(
                    { key: "outline", label: "Outline", kind: "text" },
                    serializeOutline({ ...outline, color: event.target.value }),
                  )
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <AddableRow
        label="Box shadows"
        summary={shadows.length > 0 ? summarizeBoxShadow(shadow) : undefined}
        active={editingShadow}
        onAdd={() => {
          setEditingShadow(true);
          onFieldChange(
            { key: "boxShadow", label: "Box shadow", kind: "text" },
            serializeBoxShadows([shadow]),
          );
        }}
        onRemove={() => {
          setEditingShadow(false);
          onFieldChange({ key: "boxShadow", label: "Box shadow", kind: "text" }, "");
        }}
        onToggle={() => setEditingShadow(!editingShadow)}
      >
        <div className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground">Type</Label>
          <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-0.5">
            {([
              { label: "Outside", inset: false },
              { label: "Inside", inset: true },
            ] as const).map((option) => (
              <button
                key={option.label}
                type="button"
                className={cn(
                  "flex-1 rounded px-2 py-1 text-[11px] transition-colors",
                  shadow.inset === option.inset
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => updateShadow({ ...shadow, inset: option.inset })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {/*
          A shadow built from calc() or var() has no numbers for the sliders to
          hold, so it is edited as text. Feeding it to the sliders showed four
          zeros and overwrote the expression on the first drag.
        */}
        {shadow.raw ? (
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Value</Label>
            <Input
              type="text"
              className="h-8 text-xs"
              value={shadow.raw}
              onChange={(event) =>
                onFieldChange(
                  { key: "boxShadow", label: "Box shadow", kind: "text" },
                  [event.target.value, ...shadows.slice(1).map(serializeBoxShadow)].join(", "),
                )
              }
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              This shadow uses an expression, so it is edited directly.
            </p>
          </div>
        ) : (
          <>
            <SliderRow label="X" value={shadow.x} min={-64} max={64} unit={shadowUnit} onChange={(x) => updateShadow({ ...shadow, x })} />
            <SliderRow label="Y" value={shadow.y} min={-64} max={64} unit={shadowUnit} onChange={(y) => updateShadow({ ...shadow, y })} />
            <SliderRow label="Blur" value={shadow.blur} min={0} max={64} unit={shadowUnit} onChange={(blur) => updateShadow({ ...shadow, blur })} />
            <SliderRow label="Size" value={shadow.spread} min={0} max={64} unit={shadowUnit} onChange={(spread) => updateShadow({ ...shadow, spread })} />
          </>
        )}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
            <input
              type="color"
              value={shadow.color && isHexColor(shadow.color) ? shadow.color : "#000000"}
              aria-label="Shadow color swatch"
              className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
              onChange={(event) => updateShadow({ ...shadow, color: event.target.value })}
            />
            <Input
              type="text"
              className="h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              placeholder="currentColor"
              value={shadow.color ?? ""}
              onChange={(event) => updateShadow({ ...shadow, color: event.target.value })}
            />
          </div>
        </div>
      </AddableRow>

      <AddableRow
        label="2D & 3D transforms"
        summary={transformText.trim() ? summarizeTransformMove(transformText) : undefined}
        active={editingTransform}
        onAdd={() => {
          setEditingTransform(true);
          onFieldChange(
            { key: "transform", label: "Transform", kind: "text" },
            upsertTransformMove("", move),
          );
        }}
        onRemove={() => {
          setEditingTransform(false);
          onFieldChange({ key: "transform", label: "Transform", kind: "text" }, "");
        }}
        onToggle={() => setEditingTransform(!editingTransform)}
      >
        <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            className="flex-1 rounded bg-background px-2 py-1 text-[11px] text-foreground shadow-sm"
          >
            Move
          </button>
        </div>
        <SliderRow label="X" value={move.x} min={-200} max={200} onChange={(x) => updateMove("x", x)} />
        <SliderRow label="Y" value={move.y} min={-200} max={200} onChange={(y) => updateMove("y", y)} />
        <SliderRow label="Z" value={move.z} min={-200} max={200} onChange={(z) => updateMove("z", z)} />
      </AddableRow>

      <AddableRow
        label="Transitions"
        summary={
          transitionText.trim()
            ? `${transition.property} ${transition.durationMs}ms ${transition.easing}`
            : undefined
        }
        active={editingTransition}
        onAdd={() => {
          setEditingTransition(true);
          onFieldChange(
            { key: "transition", label: "Transition", kind: "text" },
            serializeTransition(transition),
          );
        }}
        onRemove={() => {
          setEditingTransition(false);
          onFieldChange({ key: "transition", label: "Transition", kind: "text" }, "");
        }}
        onToggle={() => setEditingTransition(!editingTransition)}
      >
        <div className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground">Property</Label>
          <Input
            type="text"
            className="h-8 text-xs"
            value={transition.property}
            onChange={(event) => updateTransition({ ...transition, property: event.target.value })}
          />
        </div>
        <SliderRow
          label="Time"
          value={transition.durationMs}
          min={0}
          max={2000}
          unit="MS"
          onChange={(durationMs) => updateTransition({ ...transition, durationMs })}
        />
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Easing</Label>
          <Select
            value={transition.easing}
            onValueChange={(easing) => updateTransition({ ...transition, easing })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["ease", "linear", "ease-in", "ease-out", "ease-in-out"].map((easing) => (
                <SelectItem key={easing} value={easing} className="text-xs">
                  {easing}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AddableRow>

      <AddableRow
        label="Filters"
        summary={filterBlur > 0 ? `Blur: ${filterBlur}px` : undefined}
        active={editingFilter}
        onAdd={() => {
          setEditingFilter(true);
          onFieldChange(
            { key: "filter", label: "Filter", kind: "text" },
            upsertBlur("", 5),
          );
        }}
        onRemove={() => {
          setEditingFilter(false);
          onFieldChange({ key: "filter", label: "Filter", kind: "text" }, "");
        }}
        onToggle={() => setEditingFilter(!editingFilter)}
      >
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Filter</Label>
          <Select value="blur" onValueChange={() => undefined}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue>Blur</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blur" className="text-xs">
                Blur
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SliderRow
          label="Radius"
          value={filterBlur}
          min={0}
          max={64}
          onChange={(radius) =>
            onFieldChange(
              { key: "filter", label: "Filter", kind: "text" },
              upsertBlur(filterText, radius),
            )
          }
        />
      </AddableRow>

      <AddableRow
        label="Backdrop filters"
        summary={backdropBlur > 0 ? `Blur: ${backdropBlur}px` : undefined}
        active={editingBackdrop}
        onAdd={() => {
          setEditingBackdrop(true);
          onFieldChange(
            { key: "backdropFilter", label: "Backdrop filter", kind: "text" },
            upsertBlur("", 5),
          );
        }}
        onRemove={() => {
          setEditingBackdrop(false);
          onFieldChange({ key: "backdropFilter", label: "Backdrop filter", kind: "text" }, "");
        }}
        onToggle={() => setEditingBackdrop(!editingBackdrop)}
      >
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Filter</Label>
          <Select value="blur" onValueChange={() => undefined}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue>Blur</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blur" className="text-xs">
                Blur
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SliderRow
          label="Radius"
          value={backdropBlur}
          min={0}
          max={64}
          onChange={(radius) =>
            onFieldChange(
              { key: "backdropFilter", label: "Backdrop filter", kind: "text" },
              upsertBlur(backdropText, radius),
            )
          }
        />
      </AddableRow>

      <div className="space-y-1">
        <Label className="text-[11px] font-medium text-muted-foreground">Cursor</Label>
        <Select
          value={cursor.authored !== undefined ? String(cursor.authored) : undefined}
          onValueChange={(value) =>
            onFieldChange(
              { key: "cursor", label: "Cursor", kind: "select", options: CURSOR_OPTIONS },
              value,
            )
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <MousePointer2 className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={cursor.placeholder ?? "Auto"} />
          </SelectTrigger>
          <SelectContent>
            {CURSOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SegmentBar label="Events">
        {POINTER_EVENTS_OPTIONS.map((option) => (
          <SegmentButton
            key={option.value}
            title={option.label}
            active={
              (pointerEvents.authored !== undefined
                ? String(pointerEvents.authored)
                : pointerEvents.placeholder ?? "auto") === option.value
            }
            onClick={() =>
              onFieldChange(
                {
                  key: "pointerEvents",
                  label: "Pointer events",
                  kind: "select",
                  options: POINTER_EVENTS_OPTIONS,
                },
                option.value === "auto" ? "" : option.value,
              )
            }
          >
            <span className="text-[11px]">{option.label}</span>
          </SegmentButton>
        ))}
      </SegmentBar>
    </div>
  );
}
