"use client";

import { useFormContext } from "../runtime/form-context";
import { SelectView, readSelectProps } from "./select-view";

export function SelectClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  const form = useFormContext();
  const field = typeof props.field === "string" ? props.field : "";
  const fieldDefinition = form.getFieldDefinition(field);
  const selectProps = readSelectProps(id, props, fieldDefinition);
  const value = form.state.values[field];
  const error = form.state.errors[field];
  const disabled = form.state.submitting || Boolean(form.state.rateLimitMessage);

  return (
    <SelectView
      {...selectProps}
      value={typeof value === "string" ? value : ""}
      error={error}
      disabled={disabled}
      onChange={(event) => {
        form.setFieldValue(field, event.target.value);
      }}
    />
  );
}
