import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { renderEmptyState } from "./empty-placeholder";

/**
 * A container that is itself a link — the primitive needed for things like a
 * clickable project row or card (link-block pattern).
 *
 * WEBFLOW-DEV-REF: remove before release — prior comment named an external product.
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
      style={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
        ...style,
      }}
    >
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Link Block")}
    </a>
  );
}

export const LinkBlockComponent: ComponentDefinition = {
  type: "LinkBlock",
  label: "Link Block",
  description:
    "Wraps other components so the entire area is clickable, like a card, image, or tile. Use a Link when only the words should be clickable.",
  category: "Navigation",
  icon: LinkBlockIcon,
  renderer: LinkBlockRenderer,
  defaultProps: { linkType: "url", pageId: "", href: "", newTab: false },
  propertySchema: [
    {
      key: "linkType",
      label: "Link type",
      description:
        "Page keeps the link working when you rename or move that page. URL points anywhere, including other sites.",
      type: "select",
      defaultValue: "url",
      options: [
        { label: "Page", value: "page" },
        { label: "URL", value: "url" },
      ],
    },
    {
      key: "pageId",
      label: "Page",
      description: "Which page in this project to open.",
      type: "page",
      defaultValue: "",
    },
    {
      key: "href",
      label: "URL",
      description: "The full address, including https://.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "newTab",
      label: "Open in new tab",
      description:
        "Leaves your site open behind the new tab. Helpful for other people's sites, unhelpful for your own pages.",
      type: "boolean",
      defaultValue: false,
    },
  ],
  constraints: {},
};
