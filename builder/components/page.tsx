import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { renderEmptyState } from "./empty-placeholder";

function PageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PageRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const style = props.style as React.CSSProperties | undefined;
  return (
    <div data-node-type="Page" data-node-id={id} style={style}>
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Page")}
    </div>
  );
}

export const PageComponent: ComponentDefinition = {
  type: "Page",
  description:
    "The whole page. Everything on the canvas lives inside it, so page-wide background and text defaults belong here.",
  category: "Layout",
  icon: PageIcon,
  renderer: PageRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: { rootOnly: true },
};
