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
  category: "Navigation",
  icon: LinkIcon,
  renderer: LinkRenderer,
  defaultProps: { text: "Link", href: "", newTab: false },
  propertySchema: [
    { key: "text", label: "Text", type: "string", defaultValue: "Link" },
    { key: "href", label: "URL", type: "string", defaultValue: "" },
    { key: "newTab", label: "Open in new tab", type: "boolean", defaultValue: false },
  ],
  constraints: { allowedChildren: [] },
};
