import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { renderEmptyState } from "./empty-placeholder";

function ContainerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function ContainerRenderer({
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
    <div data-node-type="Container" data-node-id={id} style={style}>
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Container")}
    </div>
  );
}

export const ContainerComponent: ComponentDefinition = {
  type: "Container",
  description:
    "Centres its children and caps how wide they get. Unlike a Section it does not span the screen; it holds the readable column inside one.",
  category: "Layout",
  icon: ContainerIcon,
  renderer: ContainerRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: {},
};
