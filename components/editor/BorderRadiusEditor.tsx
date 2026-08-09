"use client";

import { useId, useMemo, useState, type JSX } from "react";
import type { BuilderNode } from "@/builder/document/types";
import { BORDER_RADIUS_CORNERS } from "@/builder/styles/fields";
import {
  isCommittableNumber,
  parseDimension,
  serializeDimension,
} from "@/builder/styles/dimension";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

type CornerKey = (typeof BORDER_RADIUS_CORNERS)[number];

function CornerTopLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 4V1h3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CornerTopRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M8 1h3v3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CornerBottomLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 8v3h3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CornerBottomRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M11 8v3H8" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

const CORNER_META: Record<
  CornerKey,
  { label: string; gridClass: string; Icon: () => JSX.Element }
> = {
  borderTopLeftRadius: {
    label: "Top left radius",
    gridClass: "col-start-1 row-start-1 justify-self-start",
    Icon: CornerTopLeftIcon,
  },
  borderTopRightRadius: {
    label: "Top right radius",
    gridClass: "col-start-2 row-start-1 justify-self-end",
    Icon: CornerTopRightIcon,
  },
  borderBottomLeftRadius: {
    label: "Bottom left radius",
    gridClass: "col-start-1 row-start-2 justify-self-start",
    Icon: CornerBottomLeftIcon,
  },
  borderBottomRightRadius: {
    label: "Bottom right radius",
    gridClass: "col-start-2 row-start-2 justify-self-end",
    Icon: CornerBottomRightIcon,
  },
};

/** Number for the slider; 0 for values it can't represent (calc, var). */
function radiusNumber(value: string | number | undefined): number {
  const parsed = parseDimension(value);
  return parsed.mode === "value" ? Number.parseFloat(parsed.numeric) : 0;
}

/**
 * What the corner box shows: a bare number for px, and the value as written for
 * anything else. Formatting everything as a number turned a `50%` pill radius
 * into `50`, which the next edit wrote back as `50px`, and showed `calc(…)` as
 * a plain `0`.
 */
function formatRadius(value: string | number | undefined): string {
  const parsed = parseDimension(value);
  if (parsed.mode === "empty") {
    return "";
  }
  return parsed.mode === "value" && parsed.unit === "px" ? parsed.numeric : parsed.raw;
}

/** A typed corner: bare numbers become px, everything else is kept verbatim. */
function toRadiusValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return isCommittableNumber(trimmed) ? serializeDimension(trimmed, "px") : trimmed;
}

/** Only a plain px length can be driven by the linked slider. */
function isSliderRadius(value: string | number | undefined): boolean {
  const parsed = parseDimension(value);
  return parsed.mode === "empty" || (parsed.mode === "value" && parsed.unit === "px");
}

function LinkedRadiusIcon({ className }: { readonly className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className} aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IndividualRadiusIcon({ className }: { readonly className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className} aria-hidden="true">
      <path
        d="M4 1H1v3M10 1h3v3M1 10v3h3M13 10v3h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function readCornerValues(
  declaration: Record<string, string | number>,
): Record<CornerKey, string | number | undefined> {
  return {
    borderTopLeftRadius: declaration.borderTopLeftRadius,
    borderTopRightRadius: declaration.borderTopRightRadius,
    borderBottomRightRadius: declaration.borderBottomRightRadius,
    borderBottomLeftRadius: declaration.borderBottomLeftRadius,
  };
}

function cornersAreLinked(values: Record<CornerKey, string | number | undefined>): boolean {
  // Compares the authored text, so `24px` and `24%` are not treated as equal.
  const written = BORDER_RADIUS_CORNERS.map((key) =>
    values[key] === undefined ? "" : String(values[key]).trim(),
  );
  return written.every((value) => value === written[0]);
}

type BorderRadiusEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onPatch: (mutate: (draft: Record<string, string | number>) => void) => void;
};

export function BorderRadiusEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onPatch,
}: BorderRadiusEditorProps) {
  const sliderId = useId();
  const values = readCornerValues(declaration);
  const linked = useMemo(() => cornersAreLinked(values), [values]);
  const [mode, setMode] = useState<"linked" | "individual">(linked ? "linked" : "individual");

  const unifiedPx = radiusNumber(
    values.borderTopLeftRadius ?? declaration.borderRadius ?? values.borderTopRightRadius,
  );

  /** Every corner is a plain px length, so the linked slider is meaningful. */
  const sliderUsable = BORDER_RADIUS_CORNERS.every((key) => isSliderRadius(values[key]));

  const previewRadius = BORDER_RADIUS_CORNERS.map((key) => {
    const authored = values[key];
    if (authored !== undefined) {
      return toRadiusValue(String(authored)) || "0px";
    }
    const effective = resolveEffectiveStyleField(node, breakpoint, key, registry);
    return effective ? toRadiusValue(String(effective.value)) || "0px" : "0px";
  }).join(" ");

  const applyAllCorners = (px: number) => {
    /*
     * Zero is written, not deleted. Deleting fell back to the cascade, so a node
     * inheriting 24px from Mobile could not be squared off at a wider
     * breakpoint — the corner sprang back to 24px.
     */
    const clamped = `${Math.max(0, Math.round(px))}px`;
    onPatch((draft) => {
      delete draft.borderRadius;
      for (const corner of BORDER_RADIUS_CORNERS) {
        draft[corner] = clamped;
      }
    });
  };

  const applyCorner = (corner: CornerKey, raw: string) => {
    const next = toRadiusValue(raw);
    onPatch((draft) => {
      delete draft.borderRadius;
      if (!next) {
        // Empty means "inherit again", which is the only way to unset a corner.
        delete draft[corner];
      } else {
        draft[corner] = next;
      }
    });
  };

  const clearAllCorners = () => {
    onPatch((draft) => {
      delete draft.borderRadius;
      for (const corner of BORDER_RADIUS_CORNERS) {
        delete draft[corner];
      }
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium text-muted-foreground">Radius</Label>
        <div className="flex items-center gap-1">
          {BORDER_RADIUS_CORNERS.some((corner) => values[corner] !== undefined) ? (
            <button
              type="button"
              title="Clear radius override"
              aria-label="Clear radius override"
              onClick={clearAllCorners}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              title="Link all corners"
              aria-label="Link all corners"
              aria-pressed={mode === "linked"}
              onClick={() => {
                setMode("linked");
                applyAllCorners(unifiedPx);
              }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                mode === "linked"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LinkedRadiusIcon />
            </button>
            <button
              type="button"
              title="Edit corners individually"
              aria-label="Edit corners individually"
              aria-pressed={mode === "individual"}
              onClick={() => setMode("individual")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition-colors",
                mode === "individual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <IndividualRadiusIcon />
            </button>
          </div>
        </div>
      </div>

      {mode === "linked" ? (
        <div className="flex items-center gap-2">
          <input
            id={sliderId}
            type="range"
            min={0}
            // Grows with the value so a 120px radius is not snapped down to 64
            // the moment the handle is touched.
            max={Math.max(64, Math.ceil(unifiedPx))}
            step={1}
            value={unifiedPx}
            disabled={!sliderUsable}
            aria-label="All corners radius"
            className="h-1.5 min-w-0 flex-1 accent-primary disabled:opacity-40"
            onChange={(event) => applyAllCorners(Number(event.target.value))}
          />
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="decimal"
              aria-label="All corners radius"
              className="h-7 w-12 px-1 text-center text-xs tabular-nums"
              value={String(unifiedPx)}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                applyAllCorners(Number.isNaN(next) ? 0 : next);
              }}
            />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">PX</span>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-border/80 bg-muted/15 p-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {BORDER_RADIUS_CORNERS.map((corner) => {
            const meta = CORNER_META[corner];
            const Icon = meta.Icon;
            const authored = values[corner];
            const effective =
              authored === undefined
                ? resolveEffectiveStyleField(node, breakpoint, corner, registry)
                : undefined;
            const placeholder =
              effective && effective.source !== "authored"
                ? formatRadius(String(effective.value))
                : "0";

            return (
              <div key={corner} className={cn("flex items-center gap-1", meta.gridClass)}>
                <Icon />
                <Input
                  type="text"
                  inputMode="decimal"
                  title={meta.label}
                  aria-label={meta.label}
                  className="h-6 w-11 px-1 text-center text-[11px] tabular-nums"
                  placeholder={placeholder}
                  value={authored !== undefined ? formatRadius(authored) : ""}
                  onChange={(event) => {
                    if (mode === "linked") {
                      const next = Number.parseFloat(event.target.value);
                      applyAllCorners(Number.isNaN(next) ? 0 : next);
                    } else {
                      applyCorner(corner, event.target.value);
                    }
                  }}
                />
                <span className="text-[9px] uppercase text-muted-foreground">px</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex justify-center">
          <div className="relative flex h-20 w-full max-w-[9rem] items-center justify-center rounded-md border border-dashed border-muted-foreground/35 bg-background/80 p-3">
            <div
              className="h-full w-full border-2 border-primary/70 bg-primary/10 transition-[border-radius] duration-150"
              style={{ borderRadius: previewRadius }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
