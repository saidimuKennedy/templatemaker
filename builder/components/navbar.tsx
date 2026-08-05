import type { ComponentDefinition } from "../registry/types";

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
        ...style,
      }}
    >
      {children}
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
