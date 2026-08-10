import type { ComponentDefinition } from "../registry/types";
import { SelectClientRenderer } from "./select-client";
import { SelectView, readSelectProps } from "./select-view";

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SelectRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  return <SelectView {...readSelectProps(id, props)} />;
}

export const SelectComponent: ComponentDefinition = {
  type: "Select",
  description: "Dropdown selection bound to a resource field.",
  category: "Interaction",
  icon: SelectIcon,
  renderer: SelectRenderer,
  clientRenderer: SelectClientRenderer,
  runtime: "client",
  defaultProps: {
    field: "",
    label: "Choose",
    options: [{ label: "Option A", value: "a" }, { label: "Option B", value: "b" }],
  },
  propertySchema: [
    {
      key: "field",
      label: "Field",
      description: "Resource field name this select writes to.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "label",
      label: "Label",
      description: "Visible label shown above the dropdown.",
      type: "string",
      defaultValue: "Choose",
    },
  ],
  constraints: {
    allowedParents: ["Form", "Stack", "Container"],
    allowedChildren: [],
  },
};
