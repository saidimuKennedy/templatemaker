import { Children } from "react";
import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../registry/types";
import type { NodeProps } from "../document/types";
import { renderEmptyState } from "./empty-placeholder";

function StackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="2" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="3" y="6.5" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="3" y="11" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export const JUSTIFY_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

export const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

export const STACK_LAYOUT_PROP_KEYS = ["direction", "justify", "align", "wrap"] as const;

/** Single source for render defaults and Design-panel effective values. */
export function resolveStackStyleDefaults(props: NodeProps): CSSProperties {
  const direction = props.direction === "row" ? "row" : "column";
  const justify = typeof props.justify === "string" ? props.justify : "start";
  const align = typeof props.align === "string" ? props.align : "stretch";
  const wrap = props.wrap === "nowrap" ? "nowrap" : "wrap";

  return {
    display: "flex",
    flexDirection: direction,
    gap: "8px",
    justifyContent: JUSTIFY_MAP[justify] ?? JUSTIFY_MAP.start,
    alignItems: ALIGN_MAP[align] ?? ALIGN_MAP.stretch,
    ...(direction === "row" ? { flexWrap: wrap } : {}),
  };
}

function StackRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const style = props.style as React.CSSProperties | undefined;
  const defaults = resolveStackStyleDefaults(props as NodeProps);

  return (
    <div
      data-node-type="Stack"
      data-node-id={id}
      style={{
        ...defaults,
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Stack")}
    </div>
  );
}

export const StackComponent: ComponentDefinition = {
  type: "Stack",
  description:
    "Lays children out in a single line, down the page or across it. Use a Stack when order matters most; use a Grid when you want even columns.",
  category: "Layout",
  icon: StackIcon,
  renderer: StackRenderer,
  defaultProps: {
    direction: "column",
    justify: "start",
    align: "stretch",
    wrap: "wrap",
  },
  layoutPropKeys: STACK_LAYOUT_PROP_KEYS,
  resolveStyleDefaults: resolveStackStyleDefaults,
  propertySchema: [],
  constraints: {},
};
