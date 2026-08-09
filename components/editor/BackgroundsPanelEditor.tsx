"use client";

import { useId, useState } from "react";
import type { BuilderNode } from "@/builder/document/types";
import {
  BACKGROUND_REPEAT_OPTIONS,
  BACKGROUND_SIZE_OPTIONS,
  type StyleField,
} from "@/builder/styles/fields";
import { resolveEffectiveStyleField } from "@/builder/styles/effective";
import { defaultTokens } from "@/builder/styles/tokens";
import type { Breakpoint } from "@/builder/styles/types";
import type { ComponentRegistry } from "@/builder/registry/types";
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
import { ChevronRight, Plus, X } from "lucide-react";

const GRADIENT_PRESETS = [
  {
    label: "Soft fade",
    value: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(15,23,42,0.65) 100%)",
  },
  {
    label: "Blue tint",
    value: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
  },
  {
    label: "Muted wash",
    value: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
  },
] as const;

function fieldValue(
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
  key: string,
): { authored?: string | number; placeholder?: string; inherited?: boolean } {
  const authored = declaration[key];
  if (authored !== undefined) {
    return { authored };
  }
  const effective = resolveEffectiveStyleField(node, breakpoint, key, registry);
  if (!effective || effective.source === "authored") {
    return {};
  }
  return {
    placeholder: String(effective.value),
    inherited: true,
  };
}

function summarizeBackgroundImage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("url(")) {
    const match = /url\(["']?([^"')]+)["']?\)/.exec(trimmed);
    const source = match?.[1] ?? trimmed;
    const leaf = source.split("/").pop() ?? source;
    return leaf.length > 28 ? `${leaf.slice(0, 25)}…` : leaf;
  }
  if (trimmed.startsWith("linear-gradient")) {
    return "Linear gradient";
  }
  if (trimmed.startsWith("radial-gradient")) {
    return "Radial gradient";
  }
  return trimmed.length > 32 ? `${trimmed.slice(0, 29)}…` : trimmed;
}

function isTransparentColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "transparent";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

type BackgroundsPanelEditorProps = {
  readonly node: BuilderNode;
  readonly breakpoint: Breakpoint;
  readonly registry: ComponentRegistry;
  readonly declaration: Record<string, string | number>;
  readonly onFieldChange: (field: StyleField, value: string) => void;
};

export function BackgroundsPanelEditor({
  node,
  breakpoint,
  registry,
  declaration,
  onFieldChange,
}: BackgroundsPanelEditorProps) {
  const colorInputId = useId();
  const imageInputId = useId();

  const image = fieldValue(node, breakpoint, registry, declaration, "backgroundImage");
  const imageAuthored = image.authored !== undefined ? String(image.authored) : "";
  const hasImage = imageAuthored.trim().length > 0;

  const color = fieldValue(node, breakpoint, registry, declaration, "backgroundColor");
  const colorText = color.authored !== undefined ? String(color.authored) : "";
  const colorPickerValue = isHexColor(colorText) ? colorText : "#ffffff";

  const size = fieldValue(node, breakpoint, registry, declaration, "backgroundSize");
  const position = fieldValue(node, breakpoint, registry, declaration, "backgroundPosition");
  const repeat = fieldValue(node, breakpoint, registry, declaration, "backgroundRepeat");

  const [editingImage, setEditingImage] = useState(hasImage);
  const [showMore, setShowMore] = useState(hasImage);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Image &amp; gradient</span>
          {!editingImage && !hasImage ? (
            <button
              type="button"
              aria-label="Add background image or gradient"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => setEditingImage(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Remove background image or gradient"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => {
                setEditingImage(false);
                onFieldChange(
                  { key: "backgroundImage", label: "Image / gradient", kind: "text" },
                  "",
                );
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {editingImage || hasImage ? (
          <div className="space-y-2">
            {hasImage && !editingImage ? (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-2.5 py-2 text-left text-xs hover:bg-muted/40"
                onClick={() => setEditingImage(true)}
              >
                <span className="truncate text-foreground">{summarizeBackgroundImage(imageAuthored)}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">Edit</span>
              </button>
            ) : (
              <>
                <Input
                  id={imageInputId}
                  type="text"
                  className="h-8 text-xs"
                  placeholder={image.placeholder ?? "url(…) or linear-gradient(…)"}
                  value={imageAuthored}
                  onChange={(event) =>
                    onFieldChange(
                      { key: "backgroundImage", label: "Image / gradient", kind: "text" },
                      event.target.value,
                    )
                  }
                />
                <div className="flex flex-wrap gap-1">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      onClick={() =>
                        onFieldChange(
                          { key: "backgroundImage", label: "Image / gradient", kind: "text" },
                          preset.value,
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={colorInputId} className="text-[11px] font-medium text-muted-foreground">
          Color
        </Label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
          {isTransparentColor(colorText) ? (
            <span
              aria-hidden="true"
              className="h-7 w-7 shrink-0 rounded border border-border"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
              }}
            />
          ) : (
            <input
              type="color"
              value={colorPickerValue}
              aria-label="Background color swatch"
              className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
              onChange={(event) =>
                onFieldChange(
                  { key: "backgroundColor", label: "Background", kind: "color" },
                  event.target.value,
                )
              }
            />
          )}
          <Input
            id={colorInputId}
            type="text"
            className="h-7 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
            placeholder={color.placeholder ?? "transparent"}
            value={colorText}
            onChange={(event) =>
              onFieldChange(
                { key: "backgroundColor", label: "Background", kind: "color" },
                event.target.value,
              )
            }
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50"
            onClick={() =>
              onFieldChange({ key: "backgroundColor", label: "Background", kind: "color" }, "transparent")
            }
          >
            transparent
          </button>
          {Object.entries(defaultTokens.colors).map(([name, value]) => (
            <button
              key={name}
              type="button"
              title={name}
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() =>
                onFieldChange({ key: "backgroundColor", label: "Background", kind: "color" }, value)
              }
            >
              <span
                className="h-3 w-3 rounded-sm border border-border/60"
                style={{ backgroundColor: value }}
              />
              {name}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40"
      >
        More background options
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showMore && "rotate-90")} />
      </button>

      {showMore ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Size</Label>
            <Select
              value={size.authored !== undefined ? String(size.authored) : undefined}
              onValueChange={(value) =>
                onFieldChange(
                  {
                    key: "backgroundSize",
                    label: "Size",
                    kind: "select",
                    options: BACKGROUND_SIZE_OPTIONS,
                  },
                  value,
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={size.placeholder ?? "Auto"} />
              </SelectTrigger>
              <SelectContent>
                {BACKGROUND_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Position</Label>
            <Input
              type="text"
              className="h-8 text-xs"
              placeholder={position.placeholder ?? "center"}
              value={position.authored !== undefined ? String(position.authored) : ""}
              onChange={(event) =>
                onFieldChange(
                  { key: "backgroundPosition", label: "Position", kind: "text" },
                  event.target.value,
                )
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Repeat</Label>
            <Select
              value={repeat.authored !== undefined ? String(repeat.authored) : undefined}
              onValueChange={(value) =>
                onFieldChange(
                  {
                    key: "backgroundRepeat",
                    label: "Repeat",
                    kind: "select",
                    options: BACKGROUND_REPEAT_OPTIONS,
                  },
                  value,
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={repeat.placeholder ?? "No repeat"} />
              </SelectTrigger>
              <SelectContent>
                {BACKGROUND_REPEAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
