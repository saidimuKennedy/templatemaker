import { Children } from "react";
import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../registry/types";
import type { NodeProps } from "../document/types";
import { renderEmptyState } from "./empty-placeholder";

const GAP_MAP: Record<string, string> = {
  sm: "8px",
  md: "16px",
  lg: "32px",
};

/**
 * Below this width a column stops being readable and the grid should drop to
 * fewer, wider tracks. Authorable per node via the `minColumnWidth` prop.
 *
 * 260px is chosen so a 3-up row becomes 2-up on a 768px tablet (three tracks
 * would need ~796px) and 1-up on a phone, while a 1024px desktop still fits
 * all three. Lower it to keep three across on tablet; raise it to collapse
 * sooner.
 */
export const DEFAULT_MIN_COLUMN_WIDTH_PX = 260;

export const GRID_LAYOUT_PROP_KEYS = ["columns", "gap", "minColumnWidth"] as const;

/**
 * Collapse is driven by the grid's own width, not the viewport.
 *
 * The earlier approach injected `@media (min-width:768px)` next to the node.
 * That is wrong in the editor: the canvas simulates a viewport by setting
 * `maxWidth` on a wrapper div (`Canvas.tsx`), so a media query still matches
 * the *browser window*. Toggling to Mobile on a wide monitor left three
 * columns sitting there, and the canvas disagreed with published output in
 * both directions.
 *
 * `auto-fit` + `minmax` needs no breakpoint at all. Each track wants
 * `(100% - gaps) / columns`, but never less than `minColumnWidth`; when the
 * container can't fit that many, tracks wrap and empty ones collapse. The
 * outer `min(100%, …)` stops a single track overflowing a container narrower
 * than the floor. Same rule in the canvas, in published output, and at any
 * width in between — nothing to keep in sync.
 */
export function gridTemplateColumns(
  columns: number,
  gapPx: number,
  minColumnWidth: number = DEFAULT_MIN_COLUMN_WIDTH_PX,
): string {
  if (columns <= 1) {
    return "1fr";
  }
  const totalGap = gapPx * (columns - 1);
  const idealTrack = `calc((100% - ${totalGap}px) / ${columns})`;
  return `repeat(auto-fit, minmax(min(100%, max(${minColumnWidth}px, ${idealTrack})), 1fr))`;
}

/** Single source for render defaults and Design-panel effective values. */
export function resolveGridStyleDefaults(props: NodeProps): CSSProperties {
  const columns = typeof props.columns === "number" && props.columns > 0 ? props.columns : 2;
  const gapKey = typeof props.gap === "string" ? props.gap : "md";
  const minColumnWidth =
    typeof props.minColumnWidth === "number" && props.minColumnWidth > 0
      ? props.minColumnWidth
      : DEFAULT_MIN_COLUMN_WIDTH_PX;
  const resolvedGap = GAP_MAP[gapKey] ?? GAP_MAP.md;
  const gapPx = Number.parseFloat(resolvedGap);
  const safeGapPx = Number.isFinite(gapPx) ? gapPx : 16;

  return {
    display: "grid",
    gap: resolvedGap,
    gridTemplateColumns: gridTemplateColumns(columns, safeGapPx, minColumnWidth),
  };
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GridRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const style = props.style as React.CSSProperties | undefined;
  const defaults = resolveGridStyleDefaults(props as NodeProps);

  return (
    <div
      data-node-type="Grid"
      data-node-id={id}
      style={{
        ...defaults,
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Grid")}
    </div>
  );
}

export const GridComponent: ComponentDefinition = {
  type: "Grid",
  description:
    "Arranges children into even columns that wrap on narrow screens. Use a Grid for card rows and galleries; use a Stack for a simple one-direction list.",
  category: "Layout",
  icon: GridIcon,
  renderer: GridRenderer,
  defaultProps: { columns: 2, gap: "md", minColumnWidth: DEFAULT_MIN_COLUMN_WIDTH_PX },
  layoutPropKeys: GRID_LAYOUT_PROP_KEYS,
  resolveStyleDefaults: resolveGridStyleDefaults,
  propertySchema: [],
  constraints: {},
};
