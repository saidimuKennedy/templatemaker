import type { ComponentDefinition } from "../registry/types";
import { SubmitButtonClientRenderer } from "./submit-button-client";
import { SubmitButtonView, readSubmitButtonProps } from "./submit-button-view";

function SubmitButtonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6l3 2-3 2V6z" fill="currentColor" />
    </svg>
  );
}

function SubmitButtonRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  return <SubmitButtonView {...readSubmitButtonProps(id, props)} />;
}

export const SubmitButtonComponent: ComponentDefinition = {
  type: "SubmitButton",
  description: "Submits the enclosing form to create a resource record.",
  category: "Interaction",
  icon: SubmitButtonIcon,
  renderer: SubmitButtonRenderer,
  clientRenderer: SubmitButtonClientRenderer,
  runtime: "client",
  defaultProps: { label: "Submit" },
  propertySchema: [
    {
      key: "label",
      label: "Label",
      description: "Button text shown to the visitor.",
      type: "string",
      defaultValue: "Submit",
    },
  ],
  constraints: {
    allowedParents: ["Form", "Stack", "Container"],
    allowedChildren: [],
  },
};
