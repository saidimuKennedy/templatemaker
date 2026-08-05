import type { ComponentDefinition } from "../registry/types";

function ContainerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function ContainerRenderer({
  id,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  return (
    <div data-node-type="Container" data-node-id={id}>
      {children}
    </div>
  );
}

export const ContainerComponent: ComponentDefinition = {
  type: "Container",
  category: "Layout",
  icon: ContainerIcon,
  renderer: ContainerRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: {},
};
