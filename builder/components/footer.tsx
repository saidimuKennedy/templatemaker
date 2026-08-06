import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { EmptyPlaceholder } from "./empty-placeholder";

function FooterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="14" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <rect x="1" y="11" width="14" height="4" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function FooterRenderer({
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
    <footer data-node-type="Footer" data-node-id={id} style={style}>
      {Children.count(children) > 0 ? children : <EmptyPlaceholder label="Empty Footer" />}
    </footer>
  );
}

export const FooterComponent: ComponentDefinition = {
  type: "Footer",
  category: "Navigation",
  icon: FooterIcon,
  renderer: FooterRenderer,
  defaultProps: {},
  propertySchema: [],
  constraints: {},
};
