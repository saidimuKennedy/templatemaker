"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Control } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import type { PortfolioData } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SkillsStepProps = {
  control: Control<PortfolioData>;
};

export function SkillsStep({ control }: SkillsStepProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "skills" });

  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Skill group {index + 1}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              aria-label="Remove skill group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name={`skills.${index}.category`}
              render={({ field: f }) => <Input {...f} />}
            />
          </div>
          <div className="space-y-2">
            <Label>Items (comma-separated)</Label>
            <Controller
              control={control}
              name={`skills.${index}.items`}
              render={({ field: f }) => (
                <Input
                  value={f.value?.join(", ") ?? ""}
                  onChange={(e) =>
                    f.onChange(
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    )
                  }
                />
              )}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ category: "", items: [] })}
      >
        <Plus className="h-4 w-4" />
        Add skill group
      </Button>
    </div>
  );
}
