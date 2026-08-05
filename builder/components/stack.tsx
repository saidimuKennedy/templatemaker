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
  return (
    <div
      data-node-type="Stack"
      data-node-id={id}
      style={{ display: "flex", flexDirection: direction, gap: "8px" }}
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
  defaultProps: { direction: "column" },
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
  ],
  constraints: {},
};
