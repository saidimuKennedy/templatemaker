"use client";

import type { ComponentCategory, ComponentRegistry } from "@/builder/registry/types";
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
  readonly variant?: "default" | "compact";
};

export function Toolbox({ registry, onAdd, variant = "default" }: ToolboxProps) {
  return (
    <div className="flex flex-col gap-3 p-1">
      {variant === "default" ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add element</p>
          <p className="text-[11px] text-muted-foreground">Insert a node into the page structure</p>
        </div>
      ) : null}
      {CATEGORY_ORDER.map((category) => {
        const components = registry.listByCategory(category);
        if (components.length === 0) {
          return null;
        }
        return (
          <div key={category} className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {category}
            </p>
            <div className="grid grid-cols-1 gap-1">
              {components.map((component) => {
                const Icon = component.icon;
                return (
                  <Button
                    key={component.type}
                    type="button"
                    variant="ghost"
                    className="h-8 justify-start gap-2 px-2 text-left w-full hover:bg-muted/80"
                    onClick={() => onAdd(component.type)}
                  >
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                      <Icon />
                    </span>
                    <span className="text-xs font-medium">
                      {component.label ?? component.type}
                    </span>
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
