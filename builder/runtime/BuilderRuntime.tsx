"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActionStep } from "../actions/types";
import { interpretActionSteps } from "../actions/interpret";
import type { BindingScope } from "../bindings/resolve";
import { fieldErrorsToFormErrors, formScopeToBindingScope, type FormScopeState } from "./form-scope";
import { submitFormToApi } from "./submit-form";

type ToastFn = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type FormController = {
  readonly patchState: (patch: Partial<FormScopeState>) => void;
  readonly getState: () => FormScopeState;
};

type BuilderRuntimeContextValue = {
  readonly scope: BindingScope;
  readonly runSteps: (
    steps: readonly ActionStep[],
    scopeOverride?: Partial<BindingScope>,
    formId?: string,
  ) => Promise<void>;
  readonly registerFormController: (formId: string, controller: FormController) => () => void;
};

const BuilderRuntimeContext = createContext<BuilderRuntimeContextValue | null>(null);

export function useBuilderRuntime(): BuilderRuntimeContextValue {
  const context = useContext(BuilderRuntimeContext);
  if (!context) {
    throw new Error("useBuilderRuntime must be used within BuilderRuntime.");
  }
  return context;
}

type BuilderRuntimeProps = {
  readonly children: ReactNode;
  readonly initialVars?: Readonly<Record<string, unknown>>;
  readonly toast?: ToastFn;
};

export function BuilderRuntime({
  children,
  initialVars = {},
  toast,
}: BuilderRuntimeProps) {
  const [vars, setVars] = useState<Record<string, unknown>>({ ...initialVars });
  const [openModals, setOpenModals] = useState<ReadonlySet<string>>(new Set());
  const [activeFormScope, setActiveFormScope] = useState<Readonly<Record<string, unknown>> | undefined>(
    undefined,
  );
  const formControllersRef = useRef<Map<string, FormController>>(new Map());
  const activeFormIdRef = useRef<string | null>(null);

  const scope = useMemo<BindingScope>(
    () => ({
      vars,
      ...(activeFormScope ? { form: activeFormScope } : {}),
    }),
    [activeFormScope, vars],
  );

  const notify = useCallback(
    (level: "success" | "error" | "info", message: string) => {
      if (!toast) {
        return;
      }
      toast({
        title: level === "error" ? "Error" : level === "success" ? "Success" : "Notice",
        description: message,
        variant: level === "error" ? "destructive" : "default",
      });
    },
    [toast],
  );

  const registerFormController = useCallback(
    (formId: string, controller: FormController) => {
      formControllersRef.current.set(formId, controller);
      return () => {
        formControllersRef.current.delete(formId);
        if (activeFormIdRef.current === formId) {
          activeFormIdRef.current = null;
          setActiveFormScope(undefined);
        }
      };
    },
    [],
  );

  const patchActiveForm = useCallback((patch: Partial<FormScopeState>) => {
    const formId = activeFormIdRef.current;
    if (!formId) {
      return;
    }
    const controller = formControllersRef.current.get(formId);
    controller?.patchState(patch);
    const nextState = { ...controller!.getState(), ...patch };
    setActiveFormScope(formScopeToBindingScope(nextState));
  }, []);

  const runSteps = useCallback(
    async (
      steps: readonly ActionStep[],
      scopeOverride?: Partial<BindingScope>,
      formId?: string,
    ) => {
      const mergedScope: BindingScope = {
        ...scope,
        ...scopeOverride,
        vars: scopeOverride?.vars ?? scope.vars,
        form: scopeOverride?.form ?? scope.form,
      };

      if (formId) {
        activeFormIdRef.current = formId;
      }
      if (mergedScope.form) {
        setActiveFormScope(mergedScope.form);
      }

      try {
        await interpretActionSteps(steps, {
          scope: mergedScope,
          navigate: (url, newTab) => {
            if (newTab) {
              window.open(url, "_blank", "noreferrer");
              return;
            }
            window.location.assign(url);
          },
          setVariable: (name, value) => {
            setVars((current) => ({ ...current, [name]: value }));
          },
          notify,
          openModal: (nodeId) => {
            setOpenModals((current) => new Set([...current, nodeId]));
          },
          closeModal: (nodeId) => {
            setOpenModals((current) => {
              const next = new Set(current);
              next.delete(nodeId);
              return next;
            });
          },
          setFormState: patchActiveForm,
          submitForm: async (resource, values) => {
            const formEl =
              activeFormIdRef.current !== null
                ? document.querySelector<HTMLFormElement>(
                    `form[data-node-id="${activeFormIdRef.current}"]`,
                  )
                : null;
            const result = await submitFormToApi(resource, values, formEl);
            if (result.ok) {
              return { ok: true };
            }
            if (result.rateLimited) {
              patchActiveForm({
                submitting: false,
                rateLimitMessage: `Too many submissions. Try again in ${result.retryAfterSeconds ?? 60} seconds.`,
              });
              return {
                ok: false,
                rateLimited: true,
                retryAfterSeconds: result.retryAfterSeconds,
              };
            }
            const fieldErrors = fieldErrorsToFormErrors(result.fieldErrors);
            patchActiveForm({
              submitting: false,
              submitted: false,
              errors: fieldErrors,
            });
            return { ok: false, fieldErrors };
          },
        });
      } catch (error) {
        patchActiveForm({ submitting: false });
        const message = error instanceof Error ? error.message : "Action failed.";
        notify("error", message);
      }
    },
    [notify, patchActiveForm, scope],
  );

  const value = useMemo(
    () => ({
      scope,
      runSteps,
      registerFormController,
    }),
    [registerFormController, runSteps, scope],
  );

  return (
    <BuilderRuntimeContext.Provider value={value}>
      {children}
      <div hidden data-open-modals={Array.from(openModals).join(",")} />
    </BuilderRuntimeContext.Provider>
  );
}
