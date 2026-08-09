import type { ComponentDefinition } from "../registry/types";

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.5 9.5l3-3M8.5 6.5h-2a2 2 0 100 4h2M7.5 9.5h2a2 2 0 100-4h-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const text = typeof props.text === "string" && props.text ? props.text : "Link";
  const href = typeof props.href === "string" ? props.href : "";
  const newTab = props.newTab === true;
  const style = props.style as React.CSSProperties | undefined;

  return (
    <a
      data-node-type="Link"
      data-node-id={id}
      href={href || undefined}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      style={style}
    >
      {text}
    </a>
  );
}

export const LinkComponent: ComponentDefinition = {
  type: "Link",
  description:
    "Inline text that navigates somewhere. Use a Link inside a sentence; use a Link Block to make a whole card clickable.",
  category: "Navigation",
  icon: LinkIcon,
  renderer: LinkRenderer,
  defaultProps: {
    text: "Link",
    linkType: "url",
    pageId: "",
    href: "",
    newTab: false,
  },
  propertySchema: [
    {
      key: "text",
      label: "Text",
      description:
        "The words a visitor clicks. Describe the destination instead of writing click here.",
      type: "string",
      defaultValue: "Link",
    },
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
  constraints: { allowedChildren: [] },
};
