import type { ResourceDefinition } from "../resources/types";
import type { ComponentDefinition } from "../registry/types";
import { FormClientRenderer } from "./form-client";
import { FormView, readFormProps } from "./form-view";

function FormIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4.5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function readResourceDefinition(
  props: Record<string, unknown>,
): ResourceDefinition | undefined {
  const resources = props._resources as readonly ResourceDefinition[] | undefined;
  const resourceName = typeof props.resource === "string" ? props.resource : "";
  return resources?.find((entry) => entry.name === resourceName);
}

function FormRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  return (
    <FormView {...readFormProps(id, props, readResourceDefinition(props))}>{children}</FormView>
  );
}

const FORM_CHILDREN = [
  "Input",
  "Textarea",
  "Select",
  "Checkbox",
  "SubmitButton",
  "Stack",
  "Container",
  "Text",
  "Heading",
] as const;

export const FormComponent: ComponentDefinition = {
  type: "Form",
  description:
    "Collects visitor input and writes to a resource. Add inputs inside, then wire Submit to create a record.",
  category: "Interaction",
  icon: FormIcon,
  renderer: FormRenderer,
  clientRenderer: FormClientRenderer,
  runtime: "client",
  defaultProps: { resource: "" },
  propertySchema: [
    {
      key: "resource",
      label: "Resource",
      description: "The resource this form writes to. Define it in the Data tab first.",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: {
    allowedChildren: [...FORM_CHILDREN],
  },
};
