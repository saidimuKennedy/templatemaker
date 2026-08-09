"use client";

import type { Breakpoint } from "@/builder/styles/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWPORTS: readonly {
  icon: React.ReactNode;
  value: Breakpoint;
  label: string;
  tooltip: string;
}[] = [
  { icon: <Smartphone className="h-4 w-4" />, value: "base", label: "Mobile", tooltip: "Mobile (390px)" },
  { icon: <Tablet className="h-4 w-4" />, value: "sm", label: "Small", tooltip: "Small (640px)" },
  { icon: <Laptop className="h-4 w-4" />, value: "md", label: "Tablet", tooltip: "Tablet (768px)" },
  { icon: <Monitor className="h-4 w-4" />, value: "lg", label: "Desktop", tooltip: "Desktop (fluid)" },
];

type ViewportToggleProps = {
  readonly value: Breakpoint;
  readonly onChange: (value: Breakpoint) => void;
  readonly variant?: "default" | "pill" | "segment";
  readonly showTooltips?: boolean;
  readonly tooltipSide?: "top" | "bottom";
};

function ViewportButton({
  viewport,
  active,
  onChange,
  showTooltips,
  tooltipSide,
  pill,
  segment,
}: {
  viewport: (typeof VIEWPORTS)[number];
  active: boolean;
  onChange: (value: Breakpoint) => void;
  showTooltips?: boolean;
  tooltipSide?: "top" | "bottom";
  pill?: boolean;
  segment?: boolean;
}) {
  const button = (
    <Button
      type="button"
      size="sm"
      variant={segment ? "ghost" : active ? "default" : "ghost"}
      className={
        segment
          ? cn(
              "h-7 w-7 rounded p-0",
              active && "bg-background text-foreground shadow-sm",
            )
          : pill
            ? "h-8 w-8 rounded-full p-0"
            : "h-8 w-8 p-0"
      }
      aria-label={viewport.label}
      onClick={() => onChange(viewport.value)}
    >
      {viewport.icon}
    </Button>
  );

  if (!showTooltips) {
    return button;
  }

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide ?? "top"} sideOffset={8}>
        {viewport.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function ViewportToggle({
  value,
  onChange,
  variant = "default",
  showTooltips = true,
  tooltipSide,
}: ViewportToggleProps) {
  if (variant === "segment") {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {VIEWPORTS.map((viewport) => (
          <ViewportButton
            key={viewport.value}
            viewport={viewport}
            active={value === viewport.value}
            onChange={onChange}
            showTooltips={showTooltips}
            tooltipSide={tooltipSide}
            segment
          />
        ))}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div className="inline-flex items-center gap-0.5">
        {VIEWPORTS.map((viewport) => (
          <ViewportButton
            key={viewport.value}
            viewport={viewport}
            active={value === viewport.value}
            onChange={onChange}
            showTooltips={showTooltips}
            tooltipSide={tooltipSide}
            pill
          />
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border p-1">
      {VIEWPORTS.map((viewport) => (
        <ViewportButton
          key={viewport.value}
          viewport={viewport}
          active={value === viewport.value}
          onChange={onChange}
          showTooltips={showTooltips}
          tooltipSide={tooltipSide}
        />
      ))}
    </div>
  );
}
