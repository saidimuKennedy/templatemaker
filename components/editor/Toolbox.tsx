"use client";

import type { ComponentCategory } from "@/builder/registry/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { Button } from "@/components/ui/button";

const CATEGORY_ORDER: ComponentCategory[] = [
  "Layout",
  "Content",
  "Interaction",
  "Business",
  "Navigation",
];

type ToolboxProps = {
  readonly registry: ComponentRegistry;
  readonly onAdd: (componentType: string) => void;
};

export function Toolbox({ registry, onAdd }: ToolboxProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Components</p>
        <p className="text-xs text-muted-foreground">Add nodes to the canvas</p>
      </div>
      {CATEGORY_ORDER.map((category) => {
        const components = registry.listByCategory(category);
        if (components.length === 0) {
          return null;
        }
        return (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <div className="grid grid-cols-1 gap-1">
              {components.map((component) => {
                const Icon = component.icon;
                return (
                  <Button
                    key={component.type}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start gap-2 px-2 py-2 text-left"
                    onClick={() => onAdd(component.type)}
                  >
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                      <Icon />
                    </span>
                    <span className="text-sm">{component.type}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
