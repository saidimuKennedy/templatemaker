"use client";

import { useFormContext } from "../runtime/form-context";
import { InputView, readInputProps } from "./input-view";

export function InputClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  const form = useFormContext();
  const field = typeof props.field === "string" ? props.field : "";
  const fieldDefinition = form.getFieldDefinition(field);
  const inputProps = readInputProps(id, props, fieldDefinition);
  const value = form.state.values[field];
  const error = form.state.errors[field];
  const disabled = form.state.submitting || Boolean(form.state.rateLimitMessage);

  return (
    <InputView
      {...inputProps}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      error={error}
      disabled={disabled}
      onChange={(event) => {
        const fieldDef = form.getFieldDefinition(field);
        if (fieldDef?.type === "number") {
          const raw = event.target.value;
          form.setFieldValue(field, raw === "" ? undefined : Number(raw));
          return;
        }
        form.setFieldValue(field, event.target.value);
      }}
    />
  );
}
