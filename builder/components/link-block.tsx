import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { EmptyPlaceholder } from "./empty-placeholder";

/**
 * A container that is itself a link — the primitive needed for things like a
 * clickable project row or card (Webflow calls this a "Link Block").
 *
 * Note: HTML forbids nesting an <a> inside an <a>. Putting a Link or an
 * href-bearing Button inside a LinkBlock produces invalid markup that browsers
 * will silently restructure. The registry can't express "no anchor
 * descendants" (allowedChildren is direct-children only), so this is a
 * documented constraint rather than an enforced one.
 */
function LinkBlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 9l3-2.5M8 6.5H6.75a1.75 1.75 0 100 3.5H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkBlockRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const href = typeof props.href === "string" ? props.href : "";
  const newTab = props.newTab === true;
  const style = props.style as React.CSSProperties | undefined;

  return (
    <a
      data-node-type="LinkBlock"
      data-node-id={id}
      href={href || undefined}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      style={{ display: "block", color: "inherit", textDecoration: "none", ...style }}
    >
      {Children.count(children) > 0 ? children : <EmptyPlaceholder label="Empty Link Block" />}
    </a>
  );
}

export const LinkBlockComponent: ComponentDefinition = {
  type: "LinkBlock",
  category: "Navigation",
  icon: LinkBlockIcon,
  renderer: LinkBlockRenderer,
  defaultProps: { href: "", newTab: false },
  propertySchema: [
    { key: "href", label: "URL", type: "string", defaultValue: "" },
    { key: "newTab", label: "Open in new tab", type: "boolean", defaultValue: false },
  ],
  constraints: {},
};
