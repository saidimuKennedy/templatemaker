"use client";

import type { Breakpoint } from "@/builder/styles/types";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";

const VIEWPORTS: readonly { icon: React.ReactNode; value: Breakpoint; label: string }[] = [
  { icon: <Smartphone className="h-4 w-4" />, value: "base", label: "Mobile" },
  { icon: <Monitor className="h-4 w-4" />, value: "lg", label: "Desktop" },
];

type ViewportToggleProps = {
  readonly value: Breakpoint;
  readonly onChange: (value: Breakpoint) => void;
  readonly variant?: "default" | "pill";
};

export function ViewportToggle({ value, onChange, variant = "default" }: ViewportToggleProps) {
  if (variant === "pill") {
    return (
      <div className="inline-flex items-center gap-0.5">
        {VIEWPORTS.map((viewport) => (
          <Button
            key={viewport.value}
            type="button"
            size="sm"
            variant={value === viewport.value ? "default" : "ghost"}
            className="h-8 w-8 rounded-full p-0"
            aria-label={viewport.label}
            onClick={() => onChange(viewport.value)}
          >
            {viewport.icon}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border p-1">
      {VIEWPORTS.map((viewport) => (
        <Button
          key={viewport.value}
          type="button"
          size="sm"
          variant={value === viewport.value ? "default" : "ghost"}
          className="h-8 w-8 p-0"
          aria-label={viewport.label}
          onClick={() => onChange(viewport.value)}
        >
          {viewport.icon}
        </Button>
      ))}
    </div>
  );
}
