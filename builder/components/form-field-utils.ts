import type { CSSProperties } from "react";
import type { ResourceField } from "../resources/types";

export type NativeFieldAttributes = {
  required?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal";
};

/** Derives native HTML constraint attributes from a resource field definition. */
export function nativeAttributesForField(field: ResourceField | undefined): NativeFieldAttributes {
  if (!field) {
    return {};
  }

  const attrs: NativeFieldAttributes = {};
  if (field.required) {
    attrs.required = true;
  }

  switch (field.type) {
    case "email":
      attrs.type = "email";
      break;
    case "number":
      attrs.type = "number";
      attrs.inputMode = "numeric";
      break;
    default:
      break;
  }

  return attrs;
}

export const HONEYPOT_INPUT_STYLE: CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};
