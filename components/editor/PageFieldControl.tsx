"use client";

import type { BuilderPage } from "@/builder/document/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PageFieldControlProps = {
  readonly fieldKey: string;
  readonly label: string;
  readonly description?: string;
  readonly value: string;
  readonly pages: readonly BuilderPage[];
  readonly invalid?: boolean;
  readonly broken?: boolean;
  readonly onChange: (value: string) => void;
};

export function PageFieldControl({
  fieldKey,
  label,
  description,
  value,
  pages,
  invalid,
  broken,
  onChange,
}: PageFieldControlProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={fieldKey}>{label}</Label>
        {description ? (
          <p id={`${fieldKey}-hint`} className="text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={fieldKey}
          aria-invalid={invalid || broken}
          aria-describedby={description ? `${fieldKey}-hint` : undefined}
        >
          <SelectValue placeholder="Select a page…" />
        </SelectTrigger>
        <SelectContent>
          {pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              {page.name} ({page.path})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {broken ? <p className="text-xs text-amber-600">Target page no longer exists.</p> : null}
    </div>
  );
}
