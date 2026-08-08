import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { EmptyPlaceholder } from "./empty-placeholder";

function NavbarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="2" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.6" />
      <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
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

  return (
    <nav
      data-node-type="Navbar"
      data-node-id={id}
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        // A nav that cannot wrap has only bad options when it runs out of
        // room: crush its items or overflow the page. Wrapping is the one
        // that stays readable, and it needs no breakpoint to kick in — which
        // matters because the canvas simulates width with `maxWidth`, where
        // viewport media queries do not apply.
        flexWrap: "wrap",
        rowGap: "8px",
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : <EmptyPlaceholder label="Empty Navbar" />}
    </nav>
  );
}

export const NavbarComponent: ComponentDefinition = {
  type: "Navbar",
  category: "Navigation",
  icon: NavbarIcon,
  renderer: NavbarRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: {},
};
