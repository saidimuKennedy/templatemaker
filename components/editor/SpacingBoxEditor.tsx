"use client";

import { useId, type ReactNode } from "react";
import type { BuilderNode } from "@/builder/document/types";
import {
  MARGIN_SIDES,
  PADDING_SIDES,
  type StyleField,
} from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { cn } from "@/lib/utils";

type SideKey = (typeof MARGIN_SIDES)[number] | (typeof PADDING_SIDES)[number];

const SIDE_LAYOUT: Record<
  SideKey,
  { edge: "top" | "right" | "bottom" | "left"; layer: "margin" | "padding" }
> = {
  marginTop: { edge: "top", layer: "margin" },
  marginRight: { edge: "right", layer: "margin" },
  marginBottom: { edge: "bottom", layer: "margin" },
  marginLeft: { edge: "left", layer: "margin" },
  paddingTop: { edge: "top", layer: "padding" },
  paddingRight: { edge: "right", layer: "padding" },
  paddingBottom: { edge: "bottom", layer: "padding" },
  paddingLeft: { edge: "left", layer: "padding" },
};

function formatBoxValue(value: string | number | undefined): string {
  if (value === undefined) {
    return "";
  }
  const raw = String(value).trim();
  if (raw.endsWith("px")) {
    const numeric = Number.parseFloat(raw);
    return Number.isNaN(numeric) ? raw : String(numeric);
  }
  return raw;
}

function SideInput({
  label,
  value,
  placeholder,
  inherited,
  muted,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly inherited?: boolean;
  readonly muted?: boolean;
  readonly onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <input
      id={inputId}
      type="text"
      inputMode="decimal"
      title={label}
      aria-label={label}
      value={value}
      placeholder={placeholder ?? "0"}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-6 w-11 shrink-0 rounded border border-transparent bg-background/90 px-0.5 text-center text-[11px] tabular-nums shadow-sm transition-colors",
        "hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
        inherited && "text-muted-foreground/80 placeholder:italic",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    />
  );
}

type SpacingBoxEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onSideChange: (field: StyleField, value: string) => void;
};

function renderSideInput(
  sideKey: SideKey,
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
  onSideChange: (field: StyleField, value: string) => void,
) {
  const { edge, layer } = SIDE_LAYOUT[sideKey];
  const label = `${layer} ${edge}`;
  const authored = declaration[sideKey];
  const isAuthored = authored !== undefined;
  const effective =
    !isAuthored
      ? resolveEffectiveStyleField(node, breakpoint, sideKey, registry)
      : undefined;
  const inherited = !isAuthored && effective && effective.source !== "authored";
  const placeholder = inherited && effective ? formatBoxValue(String(effective.value)) : undefined;

  return (
    <SideInput
      key={sideKey}
      label={label}
      value={isAuthored ? formatBoxValue(authored) : ""}
      placeholder={placeholder}
      inherited={inherited}
      muted={layer === "margin"}
      onChange={(value) =>
        onSideChange({ key: sideKey, label, kind: "spacing" }, value)
      }
    />
  );
}

function BoxGrid({
  label,
  variant,
  sides,
  children,
}: {
  readonly label: string;
  readonly variant: "margin" | "padding";
  readonly sides: {
    readonly top: ReactNode;
    readonly right: ReactNode;
    readonly bottom: ReactNode;
    readonly left: ReactNode;
  };
  readonly children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md p-2",
        variant === "margin"
          ? "border border-dashed border-muted-foreground/35 bg-muted/15"
          : "min-h-14 border border-border/80 bg-background shadow-sm",
      )}
    >
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>
      {/*
        3×3 grid keeps each side input in its own cell — absolute positioning
        caused margin-right and padding-right to stack on the same edge.
      */}
      <div className="mt-2 grid grid-cols-[2.75rem_1fr_2.75rem] grid-rows-[auto_minmax(3rem,auto)_auto] items-center gap-x-1 gap-y-2">
        <div className="col-start-2 row-start-1 flex justify-center">{sides.top}</div>
        <div className="col-start-1 row-start-2 flex justify-end">{sides.left}</div>
        <div className="col-start-2 row-start-2 w-full min-w-0">{children ?? <div className="min-h-10" />}</div>
        <div className="col-start-3 row-start-2 flex justify-start">{sides.right}</div>
        <div className="col-start-2 row-start-3 flex justify-center">{sides.bottom}</div>
      </div>
    </div>
  );
}

export function SpacingBoxEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onSideChange,
}: SpacingBoxEditorProps) {
  const marginSide = (key: (typeof MARGIN_SIDES)[number]) =>
    renderSideInput(key, node, breakpoint, registry, declaration, onSideChange);

  const paddingSide = (key: (typeof PADDING_SIDES)[number]) =>
    renderSideInput(key, node, breakpoint, registry, declaration, onSideChange);

  return (
    <div className="space-y-2">
      <BoxGrid
        label="Margin"
        variant="margin"
        sides={{
          top: marginSide("marginTop"),
          right: marginSide("marginRight"),
          bottom: marginSide("marginBottom"),
          left: marginSide("marginLeft"),
        }}
      >
        <BoxGrid
          label="Padding"
          variant="padding"
          sides={{
            top: paddingSide("paddingTop"),
            right: paddingSide("paddingRight"),
            bottom: paddingSide("paddingBottom"),
            left: paddingSide("paddingLeft"),
          }}
        />
      </BoxGrid>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Edit each side directly, or use spacing tokens like{" "}
        <span className="font-mono">sm</span>, <span className="font-mono">md</span>,{" "}
        <span className="font-mono">lg</span>. Clear a field to inherit.
      </p>
    </div>
  );
}
