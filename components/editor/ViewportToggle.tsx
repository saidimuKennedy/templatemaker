"use client";

import type { Breakpoint } from "@/builder/styles/types";
import { Button } from "@/components/ui/button";

const VIEWPORTS: readonly { label: string; value: Breakpoint }[] = [
  { label: "Mobile", value: "base" },
  { label: "Desktop", value: "lg" },
];

type ViewportToggleProps = {
  readonly value: Breakpoint;
  readonly onChange: (value: Breakpoint) => void;
};

export function ViewportToggle({ value, onChange }: ViewportToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border p-1">
      {VIEWPORTS.map((viewport) => (
        <Button
          key={viewport.value}
          type="button"
          size="sm"
          variant={value === viewport.value ? "default" : "ghost"}
          onClick={() => onChange(viewport.value)}
        >
          {viewport.label}
        </Button>
      ))}
    </div>
  );
}
