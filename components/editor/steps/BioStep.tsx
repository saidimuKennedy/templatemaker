"use client";

import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { PortfolioData } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BioStepProps = {
  control: Control<PortfolioData>;
};

export function BioStep({ control }: BioStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile.name">Name</Label>
        <Controller
          control={control}
          name="profile.name"
          render={({ field }) => <Input id="profile.name" {...field} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile.tagline">Tagline</Label>
        <Controller
          control={control}
          name="profile.tagline"
          render={({ field }) => <Input id="profile.tagline" {...field} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile.bio">Bio</Label>
        <Controller
          control={control}
          name="profile.bio"
          render={({ field }) => <Textarea id="profile.bio" rows={5} {...field} />}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile.location">Location</Label>
        <Controller
          control={control}
          name="profile.location"
          render={({ field }) => <Input id="profile.location" {...field} />}
        />
      </div>
    </div>
  );
}
