import type { ActionStep } from "../actions/types";
import type { BindingScope } from "../bindings/resolve";
import { evaluateCondition, resolveValue } from "../bindings/resolve";
import { isSafeNavigationUrl } from "../pages/sanitize-url";
import { formScopeToBindingScope } from "../runtime/form-scope";

export type SubmitFormRuntimeResult = {
  readonly ok: boolean;
  readonly fieldErrors?: Readonly<Record<string, string | undefined>>;
  readonly rateLimited?: boolean;
  readonly retryAfterSeconds?: number;
};

export interface ActionRuntime {
  readonly scope: BindingScope;
  readonly navigate: (url: string, newTab?: boolean) => void;
  readonly setVariable: (name: string, value: unknown) => void;
  readonly notify: (level: "success" | "error" | "info", message: string) => void;
  readonly openModal: (nodeId: string) => void;
  readonly closeModal: (nodeId: string) => void;
  readonly submitForm?: (
    resource: string,
    values: Readonly<Record<string, unknown>>,
  ) => Promise<SubmitFormRuntimeResult>;
  readonly setFormState?: (
    patch: Partial<{
      values: Readonly<Record<string, unknown>>;
      errors: Readonly<Record<string, string | undefined>>;
      submitting: boolean;
      submitted: boolean;
      rateLimitMessage: string | undefined;
    }>,
  ) => void;
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
      case "submitForm": {
        const formRoot = runtime.scope.form;
        const values =
          formRoot &&
          typeof formRoot === "object" &&
          !Array.isArray(formRoot) &&
          "values" in formRoot &&
          typeof formRoot.values === "object" &&
          formRoot.values !== null &&
          !Array.isArray(formRoot.values)
            ? (formRoot.values as Record<string, unknown>)
            : {};

        runtime.setFormState?.({ submitting: true });

        if (!runtime.submitForm) {
          throw new ActionExecutionError("submitForm requires the client runtime.");
        }

        const result = await runtime.submitForm(step.resource, values);

        if (result.ok) {
          runtime.setFormState?.({ submitting: false, submitted: true, errors: {} });
          if (step.onSuccess) {
            await interpretActionSteps(step.onSuccess, runtime);
          }
          break;
        }

        if (result.rateLimited) {
          break;
        }

        if (step.onError) {
          await interpretActionSteps(step.onError, {
            ...runtime,
            scope: {
              ...runtime.scope,
              form: formScopeToBindingScope({
                values,
                errors: result.fieldErrors ?? {},
                submitting: false,
                submitted: false,
              }),
            },
          });
        }
        break;
      }
    }
  }
}
