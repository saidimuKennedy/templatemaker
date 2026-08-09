import type { Binding } from "../bindings/types";
import type { NodeId } from "../document/types";

export type EventName = "onClick" | "onSubmit" | "onChange";

export interface Comparison {
  readonly left: unknown | Binding;
  readonly op:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "empty"
    | "notEmpty";
  readonly right?: unknown | Binding;
}

export type Condition =
  | Comparison
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition };

export type ActionStep =
  | {
      readonly type: "navigate";
      readonly to: string | Binding;
      readonly newTab?: boolean;
      readonly when?: Condition;
    }
  | {
      readonly type: "setVariable";
      readonly name: string;
      readonly value: unknown | Binding;
      readonly when?: Condition;
    }
  | {
      readonly type: "notify";
      readonly level: "success" | "error" | "info";
      readonly message: string | Binding;
      readonly when?: Condition;
    }
  | {
      readonly type: "openModal";
      readonly nodeId: NodeId;
      readonly when?: Condition;
    }
  | {
      readonly type: "closeModal";
      readonly nodeId: NodeId;
      readonly when?: Condition;
    };

export const EVENT_NAMES: readonly EventName[] = ["onClick", "onSubmit", "onChange"];

export const ACTION_STEP_TYPES = [
  "navigate",
  "setVariable",
  "notify",
  "openModal",
  "closeModal",
] as const;

export type ActionStepType = (typeof ACTION_STEP_TYPES)[number];

export function isCondition(value: unknown): value is Condition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if ("all" in value && Array.isArray(value.all)) {
    return value.all.every(isCondition);
  }
  if ("any" in value && Array.isArray(value.any)) {
    return value.any.every(isCondition);
  }
  if ("not" in value && isCondition(value.not)) {
    return true;
  }
  if ("left" in value && "op" in value && typeof value.op === "string") {
    return true;
  }
  return false;
}
