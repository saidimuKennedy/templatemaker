"use client";

import { useState, useTransition } from "react";
import type { Control } from "react-hook-form";
import {
  publishPortfolio,
  savePortfolio,
} from "@/app/(dashboard)/editor/[id]/_actions";
import { BioStep } from "@/components/editor/steps/BioStep";
import { LinksStep } from "@/components/editor/steps/LinksStep";
import { ProjectsStep } from "@/components/editor/steps/ProjectsStep";
import { SkillsStep } from "@/components/editor/steps/SkillsStep";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import type { PortfolioData } from "@/lib/schema";

const STEPS = ["Bio", "Projects", "Skills", "Links"] as const;

type WizardShellProps = {
  portfolioId: string;
  control: Control<PortfolioData>;
  getValues: () => PortfolioData;
  status: string;
};

export function WizardShell({
  portfolioId,
  control,
  getValues,
  status,
}: WizardShellProps) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await savePortfolio(portfolioId, getValues());
        toast({ title: "Saved", description: "Portfolio content updated." });
      } catch {
        toast({ title: "Error", description: "Could not save portfolio." });
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      try {
        await savePortfolio(portfolioId, getValues());
        const result = await publishPortfolio(portfolioId);
        toast({
          title: "Published",
          description: result.slug ? `Live at /p/${result.slug}` : "Portfolio is live.",
        });
      } catch {
        toast({ title: "Error", description: "Could not publish portfolio." });
      }
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </span>
          <span className="text-muted-foreground capitalize">{status.toLowerCase()}</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 0 ? <BioStep control={control} /> : null}
        {step === 1 ? <ProjectsStep control={control} /> : null}
        {step === 2 ? <SkillsStep control={control} /> : null}
        {step === 3 ? <LinksStep control={control} /> : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={pending}>
            Next
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleSave} disabled={pending}>
          Save
        </Button>
        {step === STEPS.length - 1 ? (
          <Button type="button" onClick={handlePublish} disabled={pending}>
            Publish
          </Button>
        ) : null}
      </div>
    </div>
  );
}
