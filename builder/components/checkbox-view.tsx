import type { CSSProperties, InputHTMLAttributes } from "react";
import type { ResourceField } from "../resources/types";
import { nativeAttributesForField } from "./form-field-utils";

export type CheckboxViewProps = {
  readonly id: string;
  readonly field: string;
  readonly label?: string;
  readonly style?: CSSProperties;
  readonly checked?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  readonly nativeAttrs?: ReturnType<typeof nativeAttributesForField>;
};

export function CheckboxView({
  id,
  field,
  label,
  style,
  checked,
  error,
  disabled,
  onChange,
  nativeAttrs,
}: CheckboxViewProps) {
  const inputId = `${id}-${field}`;

  return (
    <div data-node-type="Checkbox" data-node-id={id} style={style}>
      <label htmlFor={inputId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          id={inputId}
          name={field}
          type="checkbox"
          checked={checked ?? false}
          disabled={disabled}
          onChange={onChange}
          {...(nativeAttrs?.required ? { required: nativeAttrs.required } : {})}
        />
        {label ? <span>{label}</span> : null}
      </label>
      {error ? (
        <p role="alert" style={{ color: "var(--color-destructive, #dc2626)", marginTop: "4px", fontSize: "0.875rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function readCheckboxProps(
  id: string,
  props: Record<string, unknown>,
  fieldDefinition?: ResourceField,
): Omit<CheckboxViewProps, "checked" | "error" | "disabled" | "onChange"> {
  return {
    id,
    field: typeof props.field === "string" ? props.field : "",
    label: typeof props.label === "string" ? props.label : undefined,
    style: props.style as CSSProperties | undefined,
    nativeAttrs: nativeAttributesForField(fieldDefinition),
  };
}
