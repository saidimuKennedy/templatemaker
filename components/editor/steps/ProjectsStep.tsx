"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Control } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import type { PortfolioData } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ProjectsStepProps = {
  control: Control<PortfolioData>;
};

export function ProjectsStep({ control }: ProjectsStepProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "projects" });

  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Project {index + 1}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              aria-label="Remove project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Controller
              control={control}
              name={`projects.${index}.title`}
              render={({ field: f }) => <Input {...f} />}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Controller
              control={control}
              name={`projects.${index}.description`}
              render={({ field: f }) => <Textarea rows={3} {...f} />}
            />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Controller
              control={control}
              name={`projects.${index}.url`}
              render={({ field: f }) => <Input type="url" {...f} />}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Controller
              control={control}
              name={`projects.${index}.tags`}
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
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name={`projects.${index}.featured`}
              render={({ field: f }) => (
                <Switch checked={f.value} onCheckedChange={f.onChange} id={`featured-${index}`} />
              )}
            />
            <Label htmlFor={`featured-${index}`}>Featured project</Label>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            title: "",
            description: "",
            url: "",
            tags: [],
            featured: false,
          })
        }
      >
        <Plus className="h-4 w-4" />
        Add project
      </Button>
    </div>
  );
}
