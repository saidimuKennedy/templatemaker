"use client";

import { useState, type ComponentType } from "react";
import type { BuilderNode } from "@/builder/document/types";
import { POSITION_OPTIONS, type StyleField } from "@/builder/styles/fields";
import { effectiveSourceLabel, resolveEffectiveStyleField } from "@/builder/styles/effective";
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
import { Move, PanelTop, Pin, Target, X } from "lucide-react";

type PositionValue = (typeof POSITION_OPTIONS)[number]["value"];

/** Sentinel for the "Default" item: clears the authored value. Radix forbids "". */
const DEFAULT_VALUE = "__default__";

const POSITION_META: Record<
  PositionValue,
  { readonly icon: ComponentType<{ className?: string }>; readonly description: string }
> = {
  static: {
    icon: X,
    description:
      "Static is the default. The element flows in normal document order using your layout styles.",
  },
  relative: {
    icon: Move,
    description:
      "Relative keeps the element in flow but lets you nudge it with top, right, bottom, and left offsets.",
  },
  absolute: {
    icon: Target,
    description:
      "Absolute removes the element from flow and positions it against its nearest positioned ancestor.",
  },
  fixed: {
    icon: Pin,
    description: "Fixed anchors the element to the viewport — it stays put while the page scrolls.",
  },
  sticky: {
    icon: PanelTop,
    description:
      "Sticky behaves like relative until you scroll, then sticks within its container at the offset you set.",
  },
};

const OFFSET_FIELDS = [
  { key: "top", label: "Top", allowAuto: true },
  { key: "right", label: "Right", allowAuto: true },
  { key: "bottom", label: "Bottom", allowAuto: true },
  { key: "left", label: "Left", allowAuto: true },
] as const;

function isPositionValue(value: string): value is PositionValue {
  return POSITION_OPTIONS.some((option) => option.value === value);
}

type PositionPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

export function PositionPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: PositionPanelEditorProps) {
  /*
   * `declaration` is only what this breakpoint authors, but styles cascade
   * mobile-first: a node set to absolute on Mobile is still absolute on Tablet.
   * Reading position from the declaration alone reported "Static" on every
   * wider breakpoint and hid the offsets that were actually in force, so the
   * effective value decides what is shown and the authored value only decides
   * whether it reads as an override.
   */
  const authoredPosition = declaration.position;
  const effectivePosition =
    authoredPosition === undefined
      ? resolveEffectiveStyleField(node, breakpoint, "position", registry)
      : undefined;
  const rawPosition = String(authoredPosition ?? effectivePosition?.value ?? "static");
  const position: PositionValue = isPositionValue(rawPosition) ? rawPosition : "static";
  const inherited = effectivePosition !== undefined && effectivePosition.source !== "authored";

  const meta = POSITION_META[position];
  const showOffsets = position !== "static";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">Position</Label>
        <Select
          value={authoredPosition !== undefined ? position : undefined}
          onValueChange={(value) =>
            onFieldChange(
              { key: "position", label: "Position", kind: "select", options: POSITION_OPTIONS },
              value === DEFAULT_VALUE ? "" : value,
            )
          }
        >
          <SelectTrigger
            className={cn("h-9 text-xs", inherited && "italic text-muted-foreground/70")}
          >
            <SelectValue placeholder={POSITION_OPTIONS.find((o) => o.value === position)?.label} />
          </SelectTrigger>
          <SelectContent>
            {/* Lets an override go back to inheriting, which the old select did
                by leaving the value unset and which Static cannot express. */}
            <SelectItem value={DEFAULT_VALUE} className="text-xs text-muted-foreground">
              Default
            </SelectItem>
            {POSITION_OPTIONS.map((option) => {
              const OptionIcon = POSITION_META[option.value].icon;
              return (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  <span className="flex items-center gap-2">
                    <OptionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {option.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-[10px] leading-snug text-muted-foreground">{meta.description}</p>
        {inherited && effectivePosition ? (
          <p className="text-[10px] italic leading-snug text-muted-foreground/80">
            {effectiveSourceLabel(effectivePosition.source, breakpoint)}
          </p>
        ) : null}
      </div>

      {showOffsets ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {OFFSET_FIELDS.map((spec) => {
            const authored = declaration[spec.key];
            const effective =
              authored === undefined
                ? resolveEffectiveStyleField(node, breakpoint, spec.key, registry)
                : undefined;
            const offsetInherited = effective !== undefined && effective.source !== "authored";
            return (
              <DimensionField
                key={spec.key}
                spec={spec}
                authored={authored}
                placeholder={offsetInherited && effective ? String(effective.value) : undefined}
                inherited={offsetInherited}
                onChange={(value) =>
                  onFieldChange({ key: spec.key, label: spec.label, kind: "dimension" }, value)
                }
              />
            );
          })}
        </div>
      ) : null}

      {/*
        Z-index is not gated on position: it also orders flex and grid children,
        which are `static`. Hiding it there put stacking overlapping cards out of
        reach unless the node was switched to relative first.
      */}
      <ZIndexField
        node={node}
        breakpoint={breakpoint}
        registry={registry}
        authored={declaration.zIndex}
        positioned={showOffsets}
        onChange={(value) =>
          onFieldChange({ key: "zIndex", label: "Z-index", kind: "number" }, value)
        }
      />
    </div>
  );
}

function ZIndexField({
  node,
  breakpoint,
  registry,
  authored,
  positioned,
  onChange,
}: {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly authored: string | number | undefined;
  readonly positioned: boolean;
  readonly onChange: (value: string) => void;
}) {
  const effective =
    authored === undefined
      ? resolveEffectiveStyleField(node, breakpoint, "zIndex", registry)
      : undefined;
  const inherited = effective !== undefined && effective.source !== "authored";
  const committed = authored !== undefined ? String(authored) : "";

  // Same reason as DimensionField: a lone `-` is a keystroke, not a z-index, so
  // partials stay local and only whole integers reach the document.
  const [draft, setDraft] = useState(committed);
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (committed !== lastCommitted) {
    setLastCommitted(committed);
    setDraft(committed);
  }

  const handleChange = (next: string) => {
    setDraft(next);
    if (next.trim() === "") {
      onChange("");
      return;
    }
    if (/^-?\d+$/.test(next.trim())) {
      onChange(next.trim());
    }
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="position-z-index" className="text-[11px] font-medium text-muted-foreground">
        Z-index
      </Label>
      <Input
        id="position-z-index"
        type="text"
        inputMode="numeric"
        className={cn(
          "h-8 text-xs",
          inherited && "placeholder:text-muted-foreground/70 placeholder:italic",
        )}
        placeholder={inherited && effective ? String(effective.value) : "auto"}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
      />
      <p className="text-[10px] leading-snug text-muted-foreground">
        {positioned
          ? "Higher numbers sit in front, compared against other positioned elements in the same stack."
          : "Also orders flex and grid children, so it works here without changing position."}
      </p>
    </div>
  );
}
