"use client";

import type { ActionStep, EventName } from "@/builder/actions/types";
import { ACTION_STEP_TYPES, EVENT_NAMES } from "@/builder/actions/types";
import type { BuilderNode, PageId } from "@/builder/document/types";
import { createSetNodeEventsCommand } from "@/builder/inspector/edit";
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
import { Button } from "@/components/ui/button";

const EVENT_LABELS: Record<EventName, string> = {
  onClick: "Click",
  onSubmit: "Submit",
  onChange: "Change",
};

function defaultStepForType(type: ActionStep["type"]): ActionStep {
  switch (type) {
    case "navigate":
      return { type: "navigate", to: "" };
    case "setVariable":
      return { type: "setVariable", name: "myVar", value: "" };
    case "notify":
      return { type: "notify", level: "success", message: "Done" };
    case "openModal":
      return { type: "openModal", nodeId: "" };
    case "closeModal":
      return { type: "closeModal", nodeId: "" };
  }
}

function stepSummary(step: ActionStep): string {
  switch (step.type) {
    case "navigate":
      return `Navigate to ${typeof step.to === "string" ? step.to || "…" : step.to.$bind}`;
    case "setVariable":
      return `Set ${step.name}`;
    case "notify":
      return `Notify (${step.level})`;
    case "openModal":
      return `Open modal ${step.nodeId || "…"}`;
    case "closeModal":
      return `Close modal ${step.nodeId || "…"}`;
  }
}

type InteractionsPanelEditorProps = {
  readonly pageId: PageId;
  readonly node: BuilderNode;
  readonly onCommand: (command: Command) => void;
};

export function InteractionsPanelEditor({
  pageId,
  node,
  onCommand,
}: InteractionsPanelEditorProps) {
  const events = node.events ?? ({} as Partial<Record<EventName, readonly ActionStep[]>>);

  const commitEvents = (next: Partial<Record<EventName, readonly ActionStep[]>>) => {
    onCommand(createSetNodeEventsCommand(pageId, node.id, next));
  };

  const updateEventSteps = (eventName: EventName, steps: readonly ActionStep[]) => {
    commitEvents({ [eventName]: steps });
  };

  const addStep = (eventName: EventName, type: ActionStep["type"]) => {
    const existing = events[eventName] ?? [];
    updateEventSteps(eventName, [...existing, defaultStepForType(type)]);
  };

  const removeStep = (eventName: EventName, index: number) => {
    const existing = events[eventName] ?? [];
    updateEventSteps(
      eventName,
      existing.filter((_, stepIndex) => stepIndex !== index),
    );
  };

  const updateStep = (eventName: EventName, index: number, step: ActionStep) => {
    const existing = events[eventName] ?? [];
    updateEventSteps(
      eventName,
      existing.map((entry, stepIndex) => (stepIndex === index ? step : entry)),
    );
  };

  const moveStep = (eventName: EventName, index: number, direction: -1 | 1) => {
    const existing = [...(events[eventName] ?? [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= existing.length) {
      return;
    }
    const [moved] = existing.splice(index, 1);
    existing.splice(targetIndex, 0, moved!);
    updateEventSteps(eventName, existing);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Attach actions that run when a visitor interacts with this element. Steps run in order;
        a failed step stops the rest.
      </p>
      {EVENT_NAMES.map((eventName) => {
        const steps = events[eventName] ?? [];
        return (
          <div key={eventName} className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">{EVENT_LABELS[eventName]}</Label>
              <Select onValueChange={(value) => addStep(eventName, value as ActionStep["type"])}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Add step…" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_STEP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {steps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No steps for this event.</p>
            ) : (
              <ul className="space-y-2">
                {steps.map((step, index) => (
                  <li
                    key={`${eventName}-${index}`}
                    className="space-y-2 rounded border border-dashed border-border p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{stepSummary(step)}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={index === 0}
                          onClick={() => moveStep(eventName, index, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(eventName, index, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => removeStep(eventName, index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <StepEditor
                      step={step}
                      onChange={(next) => updateStep(eventName, index, next)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepEditor({
  step,
  onChange,
}: {
  readonly step: ActionStep;
  readonly onChange: (step: ActionStep) => void;
}) {
  if (step.type === "notify") {
    return (
      <div className="grid gap-2">
        <Select
          value={step.level}
          onValueChange={(value) =>
            onChange({ ...step, level: value as "success" | "error" | "info" })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-xs"
          value={typeof step.message === "string" ? step.message : step.message.$bind}
          placeholder="Message"
          onChange={(event) => onChange({ ...step, message: event.target.value })}
        />
      </div>
    );
  }

  if (step.type === "navigate") {
    return (
      <Input
        className="h-8 text-xs"
        value={typeof step.to === "string" ? step.to : step.to.$bind}
        placeholder="URL or path"
        onChange={(event) => onChange({ ...step, to: event.target.value })}
      />
    );
  }

  if (step.type === "setVariable") {
    return (
      <div className="grid gap-2">
        <Input
          className="h-8 text-xs"
          value={step.name}
          placeholder="Variable name"
          onChange={(event) => onChange({ ...step, name: event.target.value })}
        />
        <Input
          className="h-8 text-xs"
          value={
            typeof step.value === "string" || typeof step.value === "number"
              ? String(step.value)
              : ""
          }
          placeholder="Value"
          onChange={(event) => onChange({ ...step, value: event.target.value })}
        />
      </div>
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      value={step.nodeId}
      placeholder="Node id"
      onChange={(event) => onChange({ ...step, nodeId: event.target.value })}
    />
  );
}
