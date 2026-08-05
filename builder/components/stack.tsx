import type { ComponentDefinition } from "../registry/types";

function StackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="2" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="3" y="6.5" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="3" y="11" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

const JUSTIFY_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

function StackRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const direction = props.direction === "row" ? "row" : "column";
  const justify = typeof props.justify === "string" ? props.justify : "start";
  const align = typeof props.align === "string" ? props.align : "stretch";
  const style = props.style as React.CSSProperties | undefined;
  return (
    <div
      data-node-type="Stack"
      data-node-id={id}
      style={{
        display: "flex",
        flexDirection: direction,
        gap: "8px",
        justifyContent: JUSTIFY_MAP[justify] ?? JUSTIFY_MAP.start,
        alignItems: ALIGN_MAP[align] ?? ALIGN_MAP.stretch,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const StackComponent: ComponentDefinition = {
  type: "Stack",
  category: "Layout",
  icon: StackIcon,
  renderer: StackRenderer,
  defaultProps: { direction: "column", justify: "start", align: "stretch" },
  propertySchema: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { label: "Column", value: "column" },
        { label: "Row", value: "row" },
      ],
      defaultValue: "column",
    },
    {
      key: "justify",
      label: "Justify",
      type: "select",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
        { label: "Space between", value: "between" },
        { label: "Space around", value: "around" },
      ],
      defaultValue: "start",
    },
    {
      key: "align",
      label: "Align",
      type: "select",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
        { label: "Stretch", value: "stretch" },
      ],
      defaultValue: "stretch",
    },
  ],
  constraints: {},
};
