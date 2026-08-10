import type { CSSProperties, InputHTMLAttributes } from "react";
import type { ResourceField } from "../resources/types";
import { nativeAttributesForField } from "./form-field-utils";

export type InputViewProps = {
  readonly id: string;
  readonly field: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
  readonly value?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  readonly nativeAttrs?: ReturnType<typeof nativeAttributesForField>;
};

export function InputView({
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
}: InputViewProps) {
  const inputId = `${id}-${field}`;

  return (
    <div data-node-type="Input" data-node-id={id} style={style}>
      {label ? (
        <label htmlFor={inputId} style={{ display: "block", marginBottom: "4px" }}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        name={field}
        placeholder={placeholder}
        value={value ?? ""}
        disabled={disabled}
        onChange={onChange}
        {...nativeAttrs}
      />
      {error ? (
        <p role="alert" style={{ color: "var(--color-destructive, #dc2626)", marginTop: "4px", fontSize: "0.875rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function readInputProps(
  id: string,
  props: Record<string, unknown>,
  fieldDefinition?: ResourceField,
): Omit<InputViewProps, "value" | "error" | "disabled" | "onChange"> {
  return {
    id,
    field: typeof props.field === "string" ? props.field : "",
    label: typeof props.label === "string" ? props.label : undefined,
    placeholder: typeof props.placeholder === "string" ? props.placeholder : undefined,
    style: props.style as CSSProperties | undefined,
    nativeAttrs: nativeAttributesForField(fieldDefinition),
  };
}
