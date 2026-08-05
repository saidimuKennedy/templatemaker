import type { ComponentDefinition } from "../registry/types";

function PageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PageRenderer({
  id,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  return (
    <div data-node-type="Page" data-node-id={id}>
      {children}
    </div>
  );
}

export const PageComponent: ComponentDefinition = {
  type: "Page",
  category: "Layout",
  icon: PageIcon,
  renderer: PageRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: {},
};
