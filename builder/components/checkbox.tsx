import type { ComponentDefinition } from "../registry/types";
import { CheckboxClientRenderer } from "./checkbox-client";
import { CheckboxView, readCheckboxProps } from "./checkbox-view";

function CheckboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckboxRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  return <CheckboxView {...readCheckboxProps(id, props)} />;
}

export const CheckboxComponent: ComponentDefinition = {
  type: "Checkbox",
  description: "Boolean toggle bound to a resource field.",
  category: "Interaction",
  icon: CheckboxIcon,
  renderer: CheckboxRenderer,
  clientRenderer: CheckboxClientRenderer,
  runtime: "client",
  defaultProps: { field: "", label: "Agree" },
  propertySchema: [
    {
      key: "field",
      label: "Field",
      description: "Resource field name this checkbox writes to.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "label",
      label: "Label",
      description: "Text shown beside the checkbox.",
      type: "string",
      defaultValue: "Agree",
    },
  ],
  constraints: {
    allowedParents: ["Form", "Stack", "Container"],
    allowedChildren: [],
  },
};
