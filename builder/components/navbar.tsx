import { Children } from "react";
import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../registry/types";
import type { NodeProps } from "../document/types";
import { renderEmptyState } from "./empty-placeholder";

function NavbarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="2" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export function resolveNavbarStyleDefaults(_props: NodeProps = {}): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    rowGap: "8px",
  };
}

function NavbarRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const style = props.style as React.CSSProperties | undefined;
  const defaults = resolveNavbarStyleDefaults();

  return (
    <nav
      data-node-type="Navbar"
      data-node-id={id}
      style={{
        ...defaults,
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Navbar")}
    </nav>
  );
}

export const NavbarComponent: ComponentDefinition = {
  type: "Navbar",
  description:
    "The navigation bar at the top of the page. Put Links inside it so visitors can reach your other pages.",
  category: "Navigation",
  icon: NavbarIcon,
  renderer: NavbarRenderer,
  defaultProps: {},
  resolveStyleDefaults: resolveNavbarStyleDefaults,
  propertySchema: [],
  constraints: {},
};
