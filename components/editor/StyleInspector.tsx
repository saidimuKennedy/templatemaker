"use client";

import { useState } from "react";
import { STYLE_FIELDS, TEXT_ALIGN_OPTIONS, type StyleField } from "@/builder/styles/fields";
import { defaultTokens } from "@/builder/styles/tokens";
import type { NodeStyleRules } from "@/builder/styles/types";
import type { BuilderNode, PageId } from "@/builder/document/types";
import { createUpdateStylesCommand } from "@/builder/inspector/edit";
import type { Command } from "@/builder/history/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOM_VALUE = "__custom__";

const FONT_WEIGHT_OPTIONS = [
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
];

function tokenOptionsFor(field: StyleField): readonly { label: string; value: string }[] {
  if (field.kind === "color") {
    return Object.entries(defaultTokens.colors).map(([name, value]) => ({
      label: name,
      value,
    }));
  }
  if (field.kind === "spacing") {
    return Object.entries(defaultTokens.spacing).map(([name, value]) => ({
      label: name,
      value,
    }));
  }
  if (field.kind === "typography-size") {
    return Object.entries(defaultTokens.typography).map(([name, entry]) => ({
      label: name,
      value: entry.fontSize,
    }));
  }
  if (field.kind === "typography-weight") {
    return FONT_WEIGHT_OPTIONS;
  }
  if (field.kind === "text-align") {
    return TEXT_ALIGN_OPTIONS;
  }
  return [];
}

function getBaseDeclaration(node: BuilderNode): Record<string, string | number> {
  const rules = node.styles as NodeStyleRules;
  return { ...(rules.base ?? {}) };
}

function StyleFieldControl({
  field,
  value,
  onChange,
}: {
  readonly field: StyleField;
  readonly value: string | number | undefined;
  readonly onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);

  if (field.kind === "dimension") {
    return (
      <div className="space-y-2">
        <Label htmlFor={`style-${field.key}`}>{field.label}</Label>
        <Input
          id={`style-${field.key}`}
          type="text"
          placeholder="e.g. 320px, 100%"
          value={value !== undefined ? String(value) : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  const options = tokenOptionsFor(field);
  const currentValue = value !== undefined ? String(value) : "";
  const matchesToken = options.some((option) => option.value === currentValue);
  const showCustomInput = customMode || (currentValue !== "" && !matchesToken);

  return (
    <div className="space-y-2">
      <Label htmlFor={`style-${field.key}`}>{field.label}</Label>
      {showCustomInput ? (
        <div className="flex gap-2">
          <Input
            id={`style-${field.key}`}
            type="text"
            value={currentValue}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : (
        <Select
          value={currentValue}
          onValueChange={(next) => {
            if (next === CUSTOM_VALUE) {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            onChange(next);
          }}
        >
          <SelectTrigger id={`style-${field.key}`}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE}>Custom…</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

type StyleInspectorProps = {
  readonly pageId: PageId;
  readonly node: BuilderNode;
  readonly onCommand: (command: Command) => void;
};

export function StyleInspector({ pageId, node, onCommand }: StyleInspectorProps) {
  const base = getBaseDeclaration(node);

  const handleFieldChange = (field: StyleField, value: string) => {
    const nextBase = { ...base, [field.key]: value };
    onCommand(createUpdateStylesCommand(pageId, node, "base", nextBase));
  };

  return (
    <div className="space-y-4">
      {STYLE_FIELDS.map((field) => (
        <StyleFieldControl
          key={field.key}
          field={field}
          value={base[field.key]}
          onChange={(value) => handleFieldChange(field, value)}
        />
      ))}
    </div>
  );
}
