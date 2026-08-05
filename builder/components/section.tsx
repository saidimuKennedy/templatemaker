import type { ComponentDefinition } from "../registry/types";

const PADDING_MAP: Record<string, string> = {
  sm: "8px",
  md: "16px",
  lg: "32px",
};

function SectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SectionRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const padding = typeof props.padding === "string" ? props.padding : "md";
  return (
    <div data-node-type="Section" data-node-id={id} style={{ padding: PADDING_MAP[padding] ?? PADDING_MAP.md }}>
      {children}
    </div>
  );
}

export const SectionComponent: ComponentDefinition = {
  type: "Section",
  category: "Layout",
  icon: SectionIcon,
  renderer: SectionRenderer,
  defaultProps: { padding: "md" },
  propertySchema: [
    {
      key: "padding",
      label: "Padding",
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
