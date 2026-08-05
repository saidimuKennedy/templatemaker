import { registerBuiltInComponents } from "@/builder/components";
import { registerPortfolioComponents } from "@/builder/plugins/portfolio";
import { createComponentRegistry } from "@/builder/registry/registry";
import type { ComponentRegistry } from "@/builder/registry/types";

export function createPortfolioRegistry(): ComponentRegistry {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  registerPortfolioComponents(registry);
  return registry;
}
