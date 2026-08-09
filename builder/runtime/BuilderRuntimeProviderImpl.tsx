"use client";

import { useToast } from "@/components/ui/toast";
import { BuilderRuntime } from "./BuilderRuntime";

type BuilderRuntimeProviderProps = {
  readonly children: React.ReactNode;
};

/** App-level wrapper that supplies toast notifications to the builder runtime. */
export function BuilderRuntimeProvider({ children }: BuilderRuntimeProviderProps) {
  const { toast } = useToast();
  return <BuilderRuntime toast={toast}>{children}</BuilderRuntime>;
}
