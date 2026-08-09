"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

/**
 * A labelled row of mutually exclusive buttons, shared by the Design panels.
 *
 * `onClear` is what makes "back to default" expressible. The panels used to
 * write an empty value for the default option — `block`, `row`, `flex-start` —
 * which deleted the declaration rather than authoring it. Since the control
 * then re-read the effective value, the option came straight back: clicking
 * Block on a Grid (whose component default is `display: grid`) did nothing at
 * all. Options now write their own value, and clearing is its own button.
 */
export function SegmentBar({
  label,
  inherited,
  sourceLabel,
  onClear,
  children,
}: {
  readonly label: string;
  /** True when the shown value comes from the cascade or a component default. */
  readonly inherited?: boolean;
  /** e.g. "from Mobile". Rendered under the bar when inherited. */
  readonly sourceLabel?: string;
  /** Provided only when this breakpoint authors the value. */
  readonly onClear?: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        {onClear ? (
          <button
            type="button"
            title={`Clear ${label.toLowerCase()} override`}
            aria-label={`Clear ${label.toLowerCase()} override`}
            onClick={onClear}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {children}
      </div>
      {inherited && sourceLabel ? (
        <p className="text-[10px] italic leading-snug text-muted-foreground/80">{sourceLabel}</p>
      ) : null}
    </div>
  );
}

export function SegmentButton({
  title,
  active,
  /** Active because of inheritance, not because this breakpoint set it. */
  inherited,
  onClick,
  children,
  className,
}: {
  readonly title: string;
  readonly active: boolean;
  readonly inherited?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-[2.25rem] flex-1 items-center justify-center rounded transition-colors",
        active
          ? inherited
            ? "bg-background/60 text-muted-foreground shadow-sm ring-1 ring-inset ring-border"
            : "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
