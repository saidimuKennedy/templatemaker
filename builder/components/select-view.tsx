import type { CSSProperties, SelectHTMLAttributes } from "react";
import type { ResourceField } from "../resources/types";
import { nativeAttributesForField } from "./form-field-utils";

export type SelectOption = {
  readonly label: string;
  readonly value: string;
};

export type SelectViewProps = {
  readonly id: string;
  readonly field: string;
  readonly label?: string;
  readonly options: readonly SelectOption[];
  readonly style?: CSSProperties;
  readonly value?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
  readonly nativeAttrs?: ReturnType<typeof nativeAttributesForField>;
};

export function SelectView({
  id,
  field,
  label,
  options,
  style,
  value,
  error,
  disabled,
  onChange,
  nativeAttrs,
}: SelectViewProps) {
  const inputId = `${id}-${field}`;

  return (
    <div data-node-type="Select" data-node-id={id} style={style}>
      {label ? (
        <label htmlFor={inputId} style={{ display: "block", marginBottom: "4px" }}>
          {label}
        </label>
      ) : null}
      <select
        id={inputId}
        name={field}
        value={value ?? ""}
        disabled={disabled}
        onChange={onChange}
        {...(nativeAttrs?.required ? { required: nativeAttrs.required } : {})}
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" style={{ color: "var(--color-destructive, #dc2626)", marginTop: "4px", fontSize: "0.875rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function readOptions(props: Record<string, unknown>): readonly SelectOption[] {
  const raw = props.options;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const label = "label" in entry && typeof entry.label === "string" ? entry.label : "";
      const value = "value" in entry && typeof entry.value === "string" ? entry.value : "";
      if (!value) {
        return null;
      }
      return { label: label || value, value };
    })
    .filter((entry): entry is SelectOption => entry !== null);
}

export function readSelectProps(
  id: string,
  props: Record<string, unknown>,
  fieldDefinition?: ResourceField,
): Omit<SelectViewProps, "value" | "error" | "disabled" | "onChange"> {
  return {
    id,
    field: typeof props.field === "string" ? props.field : "",
    label: typeof props.label === "string" ? props.label : undefined,
    options: readOptions(props),
    style: props.style as CSSProperties | undefined,
    nativeAttrs: nativeAttributesForField(fieldDefinition),
  };
}
