import type { PropertyField } from "../registry/types";

export function validateFieldValue(
  field: PropertyField,
  value: unknown,
): string | undefined {
  switch (field.type) {
    case "string":
    case "color":
    case "image":
    case "richtext":
      if (typeof value !== "string") {
        return `"${field.label}" must be a string.`;
      }
      return undefined;

    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        return `"${field.label}" must be a number.`;
      }
      return undefined;

    case "boolean":
      if (typeof value !== "boolean") {
        return `"${field.label}" must be a boolean.`;
      }
      return undefined;

    case "select": {
      if (!field.options || field.options.length === 0) {
        return `"${field.label}" has no select options configured.`;
      }
      const allowed = field.options.map((option) => option.value);
      if (typeof value !== "string" || !allowed.includes(value)) {
        return `"${field.label}" must be one of: ${allowed.join(", ")}.`;
      }
      return undefined;
    }

    case "page":
      if (typeof value !== "string") {
        return `"${field.label}" must be a string.`;
      }
      return undefined;
  }
}
