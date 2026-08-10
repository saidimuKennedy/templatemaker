import type { ComponentDefinition } from "../registry/types";
import { InputClientRenderer } from "./input-client";
import { InputView, readInputProps } from "./input-view";

function InputIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="5" width="12" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function InputRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  return <InputView {...readInputProps(id, props)} />;
}

export const InputComponent: ComponentDefinition = {
  type: "Input",
  description: "Single-line text input bound to a resource field.",
  category: "Interaction",
  icon: InputIcon,
  renderer: InputRenderer,
  clientRenderer: InputClientRenderer,
  runtime: "client",
  defaultProps: { field: "", label: "Label", placeholder: "" },
  propertySchema: [
    {
      key: "field",
      label: "Field",
      description: "Resource field name this input writes to.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "label",
      label: "Label",
      description: "Visible label shown above the input.",
      type: "string",
      defaultValue: "Label",
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
