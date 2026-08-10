import type { CSSProperties, TextareaHTMLAttributes } from "react";
import type { ResourceField } from "../resources/types";
import { nativeAttributesForField } from "./form-field-utils";

export type TextareaViewProps = {
  readonly id: string;
  readonly field: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
  readonly value?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange?: TextareaHTMLAttributes<HTMLTextAreaElement>["onChange"];
  readonly nativeAttrs?: ReturnType<typeof nativeAttributesForField>;
};

export function TextareaView({
  id,
  field,
  label,
  placeholder,
  style,
  value,
  error,
  disabled,
  onChange,
  nativeAttrs,
}: TextareaViewProps) {
  const inputId = `${id}-${field}`;

  return (
    <div data-node-type="Textarea" data-node-id={id} style={style}>
      {label ? (
        <label htmlFor={inputId} style={{ display: "block", marginBottom: "4px" }}>
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        name={field}
        placeholder={placeholder}
        value={value ?? ""}
        disabled={disabled}
        onChange={onChange}
        rows={4}
        {...(nativeAttrs?.required ? { required: nativeAttrs.required } : {})}
      />
      {error ? (
        <p role="alert" style={{ color: "var(--color-destructive, #dc2626)", marginTop: "4px", fontSize: "0.875rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function readTextareaProps(
  id: string,
  props: Record<string, unknown>,
  fieldDefinition?: ResourceField,
): Omit<TextareaViewProps, "value" | "error" | "disabled" | "onChange"> {
  return {
    id,
    field: typeof props.field === "string" ? props.field : "",
    label: typeof props.label === "string" ? props.label : undefined,
    placeholder: typeof props.placeholder === "string" ? props.placeholder : undefined,
    style: props.style as CSSProperties | undefined,
    nativeAttrs: nativeAttributesForField(fieldDefinition),
  };
}
