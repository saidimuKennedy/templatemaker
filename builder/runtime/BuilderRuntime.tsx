"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActionStep } from "../actions/types";
import { interpretActionSteps } from "../actions/interpret";
import type { BindingScope } from "../bindings/resolve";

type BuilderRuntimeContextValue = {
  readonly scope: BindingScope;
  readonly runSteps: (steps: readonly ActionStep[]) => Promise<void>;
};

const BuilderRuntimeContext = createContext<BuilderRuntimeContextValue | null>(null);

export function useBuilderRuntime(): BuilderRuntimeContextValue {
  const context = useContext(BuilderRuntimeContext);
  if (!context) {
    throw new Error("useBuilderRuntime must be used within BuilderRuntime.");
  }
  return context;
}

type ToastFn = (options: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

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

  const scope = useMemo<BindingScope>(
    () => ({
      vars,
    }),
    [vars],
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

  const runSteps = useCallback(
    async (steps: readonly ActionStep[]) => {
      try {
        await interpretActionSteps(steps, {
          scope,
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
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action failed.";
        notify("error", message);
      }
    },
    [notify, scope],
  );

  const value = useMemo(
    () => ({
      scope,
      runSteps,
    }),
    [runSteps, scope],
  );

  return (
    <BuilderRuntimeContext.Provider value={value}>
      {children}
      {/* Modal state is tracked for future modal components (Plan 31+). */}
      <div hidden data-open-modals={Array.from(openModals).join(",")} />
    </BuilderRuntimeContext.Provider>
  );
}
