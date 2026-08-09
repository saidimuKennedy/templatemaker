import type { ComponentDefinition } from "../registry/types";
import { ButtonClientRenderer } from "./button-client";
import { ButtonView, readButtonProps } from "./button-view";

function ButtonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Static Button — a server component. Handlers are never accepted here:
 * an interactive Button renders through `clientRenderer` instead, so a
 * Button without events costs no JavaScript.
 */
function ButtonRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  return <ButtonView {...readButtonProps(id, props)} />;
}

export const ButtonComponent: ComponentDefinition = {
  type: "Button",
  description:
    "A call to action, for the one thing you want a visitor to do. Use a Button for actions and a Link for ordinary navigation.",
  category: "Interaction",
  icon: ButtonIcon,
  renderer: ButtonRenderer,
  clientRenderer: ButtonClientRenderer,
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
