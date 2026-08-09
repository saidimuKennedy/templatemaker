import type { ComponentDefinition } from "../registry/types";

function ButtonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ButtonRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const label = typeof props.label === "string" ? props.label : "Button";
  const href = typeof props.href === "string" && props.href.length > 0 ? props.href : undefined;
  const style = props.style as React.CSSProperties | undefined;

  if (href) {
    return (
      <a data-node-type="Button" data-node-id={id} href={href} role="button" style={style}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" data-node-type="Button" data-node-id={id} style={style}>
      {label}
    </button>
  );
}

export const ButtonComponent: ComponentDefinition = {
  type: "Button",
  description:
    "A call to action, for the one thing you want a visitor to do. Use a Button for actions and a Link for ordinary navigation.",
  category: "Interaction",
  icon: ButtonIcon,
  renderer: ButtonRenderer,
  defaultProps: { label: "Button", href: "" },
  propertySchema: [
    {
      key: "label",
      label: "Label",
      description:
        "The words on the button. Name the action, like Get in touch, rather than Submit.",
      type: "string",
      defaultValue: "Button",
    },
    {
      key: "href",
      label: "Link URL",
      description:
        "Where the button goes when clicked. Leave empty while the destination does not exist yet.",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: { allowedChildren: [] },
};
