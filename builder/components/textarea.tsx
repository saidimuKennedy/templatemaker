import type { ComponentDefinition } from "../registry/types";
import { TextareaClientRenderer } from "./textarea-client";
import { TextareaView, readTextareaProps } from "./textarea-view";

function TextareaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1" />
      <line x1="4" y1="8.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function TextareaRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  return <TextareaView {...readTextareaProps(id, props)} />;
}

export const TextareaComponent: ComponentDefinition = {
  type: "Textarea",
  description: "Multi-line text input bound to a resource field.",
  category: "Interaction",
  icon: TextareaIcon,
  renderer: TextareaRenderer,
  clientRenderer: TextareaClientRenderer,
  runtime: "client",
  defaultProps: { field: "", label: "Message", placeholder: "" },
  propertySchema: [
    {
      key: "field",
      label: "Field",
      description: "Resource field name this textarea writes to.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "label",
      label: "Label",
      description: "Visible label shown above the textarea.",
      type: "string",
      defaultValue: "Message",
    },
    {
      key: "placeholder",
      label: "Placeholder",
      description: "Hint text shown when the field is empty.",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: {
    allowedParents: ["Form", "Stack", "Container"],
    allowedChildren: [],
  },
};
