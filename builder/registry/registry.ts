/**
 * Component Registry implementation (docs/05, ADR-003). This is the only
 * place component types are looked up from; the canvas and renderer
 * never hardcode a component type.
 */

import type { ComponentCategory, ComponentDefinition, ComponentRegistry } from "./types";

export function createComponentRegistry(): ComponentRegistry {
  const components = new Map<string, ComponentDefinition>();

  return {
    register(definition: ComponentDefinition): void {
      if (components.has(definition.type)) {
        throw new Error(`Component type "${definition.type}" is already registered.`);
      }
      components.set(definition.type, definition);
    },
    get(type: string): ComponentDefinition | undefined {
      return components.get(type);
    },
    has(type: string): boolean {
      return components.has(type);
    },
    list(): readonly ComponentDefinition[] {
      return Array.from(components.values());
    },
    listByCategory(category: ComponentCategory): readonly ComponentDefinition[] {
      return Array.from(components.values()).filter((c) => c.category === category);
    },
  };
}
