import type { Binding } from "../bindings/types";
import type { NodeId } from "../document/types";

export type EventName = "onClick" | "onSubmit" | "onChange";

export const EVENT_LABELS: Record<EventName, string> = {
  onClick: "Click",
  onSubmit: "Submit",
  onChange: "Change",
};

export type EventOptions = {
  readonly enabled?: boolean;
  readonly throttleMs?: number;
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
};

export const THROTTLE_MS_OPTIONS = [
  { label: "None", value: 0 },
  { label: "100ms", value: 100 },
  { label: "300ms", value: 300 },
  { label: "500ms", value: 500 },
  { label: "1000ms", value: 1000 },
] as const;

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

export const ACTION_LABELS: Record<ActionStepType, string> = {
  navigate: "Navigate",
  setVariable: "Set variable",
  notify: "Notify",
  openModal: "Open modal",
  closeModal: "Close modal",
};

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
