import type { CSSProperties, FormEventHandler, ReactNode } from "react";
import type { ResourceDefinition } from "../resources/types";
import { HONEYPOT_INPUT_STYLE } from "./form-field-utils";

export type FormViewProps = {
  readonly id: string;
  readonly resource: string;
  readonly style?: CSSProperties;
  readonly honeypotField?: string;
  readonly onSubmit?: FormEventHandler<HTMLFormElement>;
  readonly children?: ReactNode;
};

export function FormView({
  id,
  resource,
  style,
  honeypotField,
  onSubmit,
  children,
}: FormViewProps) {
  return (
    <form
      data-node-type="Form"
      data-node-id={id}
      data-resource={resource}
      style={style}
      onSubmit={onSubmit}
      noValidate
    >
      {honeypotField ? (
        <input
          type="text"
          name={honeypotField}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={HONEYPOT_INPUT_STYLE}
        />
      ) : null}
      {children}
    </form>
  );
}

export function readFormProps(
  id: string,
  props: Record<string, unknown>,
  resourceDefinition?: ResourceDefinition,
): Omit<FormViewProps, "onSubmit" | "children"> {
  const resource = typeof props.resource === "string" ? props.resource : "";
  return {
    id,
    resource,
    style: props.style as CSSProperties | undefined,
    honeypotField: resourceDefinition?.honeypot,
  };
}
