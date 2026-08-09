"use client";

import { useId, useMemo, useState } from "react";
import {
  CUSTOM_UNIT,
  DIMENSION_UNITS,
  isCommittableNumber,
  parseDimension,
  serializeDimension,
  unitSelectValue,
  type DimensionUnit,
} from "@/builder/styles/dimension";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DimensionFieldSpec = {
  readonly key: string;
  readonly label: string;
  readonly allowAuto?: boolean;
  readonly allowNone?: boolean;
  readonly defaultUnit?: DimensionUnit;
};

const UNIT_LABELS: Record<DimensionUnit, string> = {
  px: "PX",
  "%": "%",
  em: "EM",
  rem: "REM",
  vh: "VH",
  vw: "VW",
};

/**
 * One number-plus-unit style control, shared by the Size and Position panels.
 *
 * Two behaviours are worth knowing about. Partial numbers (`-`, `.`) live in
 * local draft state and are not written to the document, because a controlled
 * input would otherwise persist `-px` as a real declaration. And a value the
 * parser can't split into number and unit — `calc(…)`, `var(…)`, `2ch` — puts
 * the control in Custom mode, where the raw text is edited directly instead of
 * being flattened into px.
 */
export function DimensionField({
  spec,
  authored,
  placeholder,
  inherited,
  onChange,
}: {
  readonly spec: DimensionFieldSpec;
  readonly authored: string | number | undefined;
  readonly placeholder?: string;
  readonly inherited?: boolean;
  readonly onChange: (value: string) => void;
}) {
  const inputId = useId();
  const parsed = useMemo(
    () => parseDimension(authored, spec),
    [authored, spec],
  );

  // Mirrors the authored value, but survives keystrokes that are not yet a
  // committable number. Re-syncs whenever the document's value changes.
  const committed = parsed.mode === "custom" ? parsed.raw : parsed.numeric;
  const [draft, setDraft] = useState(committed);
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (committed !== lastCommitted) {
    setLastCommitted(committed);
    setDraft(committed);
  }

  const [customMode, setCustomMode] = useState(false);
  const isCustom = parsed.mode === "custom" || customMode;
  const isKeyword = parsed.mode === "keyword";

  const unitOptions: readonly { value: string; label: string }[] = [
    ...(spec.allowAuto ? [{ value: "auto", label: "Auto" }] : []),
    ...(spec.allowNone ? [{ value: "none", label: "None" }] : []),
    ...DIMENSION_UNITS.map((unit) => ({ value: unit, label: UNIT_LABELS[unit] })),
    { value: CUSTOM_UNIT, label: "…" },
  ];

  const handleUnitChange = (next: string) => {
    if (next === "auto" || next === "none") {
      setCustomMode(false);
      onChange(next);
      return;
    }
    if (next === CUSTOM_UNIT) {
      // Keep whatever is authored; the input becomes free text from here.
      setCustomMode(true);
      setDraft(parsed.mode === "value" ? parsed.raw : draft);
      return;
    }
    setCustomMode(false);
    const unit = next as DimensionUnit;
    const numeric = isCommittableNumber(draft) ? draft.trim() : parsed.numeric || "0";
    onChange(serializeDimension(numeric, unit));
  };

  const handleTextChange = (next: string) => {
    setDraft(next);

    if (isCustom) {
      // Free text is committed on blur or Enter: `calc(` is a valid keystroke
      // but not a valid declaration, and every character would otherwise land
      // in the document and in published CSS.
      return;
    }
    if (next.trim() === "") {
      onChange("");
      return;
    }
    if (isCommittableNumber(next)) {
      onChange(serializeDimension(next, parsed.unit));
    }
    // Anything else is mid-typing (`-`, `.`): held in draft only.
  };

  const commitCustomDraft = () => {
    if (!isCustom) {
      return;
    }
    const value = draft.trim();
    if (value !== parsed.raw) {
      onChange(value);
    }
  };

  const displayValue = isKeyword
    ? parsed.keyword === "none"
      ? "None"
      : "Auto"
    : draft;

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-[11px] font-medium text-muted-foreground">
        {spec.label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={inputId}
          type="text"
          inputMode={isKeyword || isCustom ? "text" : "decimal"}
          readOnly={isKeyword}
          value={displayValue}
          placeholder={inherited ? placeholder : isKeyword ? undefined : isCustom ? "calc(…)" : "0"}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={() => commitCustomDraft()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitCustomDraft();
            }
          }}
          className={cn(
            "h-8 min-w-0 flex-1 text-xs",
            inherited && "placeholder:text-muted-foreground/70 placeholder:italic",
            isKeyword && "text-muted-foreground",
          )}
        />
        <Select
          value={isCustom ? CUSTOM_UNIT : unitSelectValue(parsed)}
          onValueChange={handleUnitChange}
        >
          <SelectTrigger
            className="h-8 w-[3.75rem] shrink-0 px-1.5 text-[10px] font-medium uppercase"
            aria-label={`${spec.label} unit`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
