import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { EmptyPlaceholder } from "./empty-placeholder";

const GAP_MAP: Record<string, string> = {
  sm: "8px",
  md: "16px",
  lg: "32px",
};

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
  const columns = typeof props.columns === "number" && props.columns > 0 ? props.columns : 2;
  const gap = typeof props.gap === "string" ? props.gap : "md";
  const style = props.style as React.CSSProperties | undefined;

  return (
    <div
      data-node-type="Grid"
      data-node-id={id}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: GAP_MAP[gap] ?? GAP_MAP.md,
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : <EmptyPlaceholder label="Empty Grid" />}
    </div>
  );
}

export const GridComponent: ComponentDefinition = {
  type: "Grid",
  category: "Layout",
  icon: GridIcon,
  renderer: GridRenderer,
  defaultProps: { columns: 2, gap: "md" },
  propertySchema: [
    { key: "columns", label: "Columns", type: "number", defaultValue: 2 },
    {
      key: "gap",
      label: "Gap",
      type: "select",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
      defaultValue: "md",
    },
  ],
  constraints: {},
};
