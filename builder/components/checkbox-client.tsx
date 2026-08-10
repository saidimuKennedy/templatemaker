"use client";

import { useFormContext } from "../runtime/form-context";
import { CheckboxView, readCheckboxProps } from "./checkbox-view";

export function CheckboxClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  const form = useFormContext();
  const field = typeof props.field === "string" ? props.field : "";
  const fieldDefinition = form.getFieldDefinition(field);
  const checkboxProps = readCheckboxProps(id, props, fieldDefinition);
  const value = form.state.values[field];
  const error = form.state.errors[field];
  const disabled = form.state.submitting || Boolean(form.state.rateLimitMessage);

  return (
    <CheckboxView
      {...checkboxProps}
      checked={value === true}
      error={error}
      disabled={disabled}
      onChange={(event) => {
        form.setFieldValue(field, event.target.checked);
      }}
    />
  );
}
