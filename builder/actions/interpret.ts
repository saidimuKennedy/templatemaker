import type { ActionStep } from "../actions/types";
import type { BindingScope } from "../bindings/resolve";
import { evaluateCondition, resolveValue } from "../bindings/resolve";
import { isSafeNavigationUrl } from "../pages/sanitize-url";

export interface ActionRuntime {
  readonly scope: BindingScope;
  readonly navigate: (url: string, newTab?: boolean) => void;
  readonly setVariable: (name: string, value: unknown) => void;
  readonly notify: (level: "success" | "error" | "info", message: string) => void;
  readonly openModal: (nodeId: string) => void;
  readonly closeModal: (nodeId: string) => void;
}

export class ActionExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionExecutionError";
  }
}

export async function interpretActionSteps(
  steps: readonly ActionStep[],
  runtime: ActionRuntime,
): Promise<void> {
  for (const step of steps) {
    if (step.when !== undefined && !evaluateCondition(step.when, runtime.scope)) {
      continue;
    }

    switch (step.type) {
      case "navigate": {
        const target = resolveValue(step.to, runtime.scope);
        if (typeof target !== "string" || !isSafeNavigationUrl(target)) {
          throw new ActionExecutionError("Navigation target is not a safe URL.");
        }
        runtime.navigate(target, step.newTab);
        break;
      }
      case "setVariable": {
        const value = resolveValue(step.value, runtime.scope);
        runtime.setVariable(step.name, value);
        break;
      }
      case "notify": {
        const message = resolveValue(step.message, runtime.scope);
        if (typeof message !== "string") {
          throw new ActionExecutionError("Notify message must resolve to a string.");
        }
        runtime.notify(step.level, message);
        break;
      }
      case "openModal":
        runtime.openModal(step.nodeId);
        break;
      case "closeModal":
        runtime.closeModal(step.nodeId);
        break;
    }
  }
}
