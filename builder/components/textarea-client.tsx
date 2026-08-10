"use client";

import { useFormContext } from "../runtime/form-context";
import { TextareaView, readTextareaProps } from "./textarea-view";

export function TextareaClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
}) {
  const form = useFormContext();
  const field = typeof props.field === "string" ? props.field : "";
  const fieldDefinition = form.getFieldDefinition(field);
  const textareaProps = readTextareaProps(id, props, fieldDefinition);
  const value = form.state.values[field];
  const error = form.state.errors[field];
  const disabled = form.state.submitting || Boolean(form.state.rateLimitMessage);

  return (
    <TextareaView
      {...textareaProps}
      value={typeof value === "string" ? value : ""}
      error={error}
      disabled={disabled}
      onChange={(event) => {
        form.setFieldValue(field, event.target.value);
      }}
    />
  );
}
