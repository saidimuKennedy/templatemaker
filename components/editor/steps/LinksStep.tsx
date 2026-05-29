"use client";

import { Github, Globe, Linkedin, Mail, Twitter } from "lucide-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { PortfolioData } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LinksStepProps = {
  control: Control<PortfolioData>;
};

const linkFields = [
  { name: "links.github" as const, label: "GitHub", icon: Github },
  { name: "links.linkedin" as const, label: "LinkedIn", icon: Linkedin },
  { name: "links.twitter" as const, label: "Twitter", icon: Twitter },
  { name: "links.website" as const, label: "Website", icon: Globe },
  { name: "links.email" as const, label: "Email", icon: Mail },
] as const;

export function LinksStep({ control }: LinksStepProps) {
  return (
    <div className="space-y-4">
      {linkFields.map(({ name, label, icon: Icon }) => (
        <div key={name} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <Input
                  id={name}
                  className="pl-9"
                  type={name === "links.email" ? "email" : "url"}
                  {...field}
                />
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
