"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActionStep } from "../actions/types";
import type { ResourceDefinition, ResourceField } from "../resources/types";
import { findResourceDefinition } from "../resources/validate";
import { useBuilderRuntime } from "./BuilderRuntime";
import { formScopeToBindingScope, type FormScopeState } from "./form-scope";

const EMPTY_FORM_STATE: FormScopeState = {
  values: {},
  errors: {},
  submitting: false,
  submitted: false,
};

type FormContextValue = {
  readonly formId: string;
  readonly resource: string;
  readonly resourceDefinition: ResourceDefinition | undefined;
  readonly state: FormScopeState;
  readonly setFieldValue: (field: string, value: unknown) => void;
  readonly submit: () => Promise<void>;
  readonly getFieldDefinition: (field: string) => ResourceField | undefined;
};

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("Form field components must be used inside a Form.");
  }
  return context;
}

export function useOptionalFormContext(): FormContextValue | null {
  return useContext(FormContext);
}

type FormProviderProps = {
  readonly formId: string;
  readonly resource: string;
  readonly resources: readonly ResourceDefinition[] | undefined;
  readonly onSubmitSteps: readonly ActionStep[] | undefined;
  readonly children: ReactNode;
};

export function FormProvider({
  formId,
  resource,
  resources,
  onSubmitSteps,
  children,
}: FormProviderProps) {
  const { runSteps, registerFormController } = useBuilderRuntime();
  const resourceDefinition = findResourceDefinition(resources, resource);
  const [state, setState] = useState<FormScopeState>(EMPTY_FORM_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return registerFormController(formId, {
      patchState: (patch) => {
        setState((current) => ({ ...current, ...patch }));
      },
      getState: () => stateRef.current,
    });
  }, [formId, registerFormController]);

  const setFieldValue = useCallback((field: string, value: unknown) => {
    setState((current) => ({
      ...current,
      values: { ...current.values, [field]: value },
      errors: { ...current.errors, [field]: undefined },
    }));
  }, []);

  const getFieldDefinition = useCallback(
    (field: string) => resourceDefinition?.fields.find((entry) => entry.name === field),
    [resourceDefinition],
  );

  const submit = useCallback(async () => {
    if (!onSubmitSteps || onSubmitSteps.length === 0 || stateRef.current.submitting) {
      return;
    }

    setState((current) => ({
      ...current,
      submitting: true,
      rateLimitMessage: undefined,
    }));

    await runSteps(
      onSubmitSteps,
      {
        form: formScopeToBindingScope({ ...stateRef.current, submitting: true }),
      },
      formId,
    );
  }, [onSubmitSteps, runSteps]);

  const value = useMemo<FormContextValue>(
    () => ({
      formId,
      resource,
      resourceDefinition,
      state,
      setFieldValue,
      submit,
      getFieldDefinition,
    }),
    [formId, getFieldDefinition, resource, resourceDefinition, setFieldValue, state, submit],
  );

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export type { FormScopeState };
