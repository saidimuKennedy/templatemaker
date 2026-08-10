"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ACTION_LABELS,
  ACTION_STEP_TYPES,
  EVENT_LABELS,
  EVENT_NAMES,
  THROTTLE_MS_OPTIONS,
  type ActionStep,
  type ActionStepType,
  type EventName,
  type EventOptions,
} from "@/builder/actions/types";
import type { BuilderDocument, BuilderNode, PageId } from "@/builder/document/types";
import {
  createSetNodeEventOptionsCommand,
  createSetNodeEventsCommand,
} from "@/builder/inspector/edit";
import type { Command } from "@/builder/history/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  MousePointerClick,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";

const EVENT_ICONS: Record<EventName, typeof MousePointerClick> = {
  onClick: MousePointerClick,
  onSubmit: Send,
  onChange: RefreshCw,
};

const DEFAULT_EVENT_OPTIONS: EventOptions = {
  enabled: true,
  throttleMs: 300,
  preventDefault: true,
  stopPropagation: false,
};

const ADD_INTERACTION_PRESETS: readonly {
  readonly eventName: EventName;
  readonly actionType: ActionStepType;
}[] = [
  { eventName: "onClick", actionType: "openModal" },
  { eventName: "onClick", actionType: "navigate" },
  { eventName: "onSubmit", actionType: "submitForm" },
  { eventName: "onSubmit", actionType: "notify" },
  { eventName: "onChange", actionType: "setVariable" },
];

function defaultStepForType(type: ActionStepType): ActionStep {
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
    case "submitForm":
      return { type: "submitForm", resource: "" };
  }
}

function collectNodes(root: BuilderNode): readonly BuilderNode[] {
  return [root, ...root.children.flatMap((child) => collectNodes(child))];
}

function resolveEventOptions(
  node: BuilderNode,
  eventName: EventName,
): EventOptions {
  return {
    ...DEFAULT_EVENT_OPTIONS,
    ...(node.eventOptions?.[eventName] ?? {}),
  };
}

type InteractionsPanelEditorProps = {
  readonly pageId: PageId;
  readonly node: BuilderNode;
  readonly document: BuilderDocument;
  readonly onCommand: (command: Command) => void;
};

export function InteractionsPanelEditor({
  pageId,
  node,
  document,
  onCommand,
}: InteractionsPanelEditorProps) {
  const page = document.pages.find((entry) => entry.id === pageId);
  const nodesById = useMemo(() => {
    const map = new Map<string, BuilderNode>();
    if (!page) {
      return map;
    }
    for (const entry of collectNodes(page.root)) {
      map.set(entry.id, entry);
    }
    return map;
  }, [page]);

  const configuredEvents = EVENT_NAMES.filter(
    (eventName) => (node.events?.[eventName]?.length ?? 0) > 0,
  );
  const [selectedEvent, setSelectedEvent] = useState<EventName | null>(
    configuredEvents[0] ?? null,
  );

  const commitEvents = (patch: Partial<Record<EventName, readonly ActionStep[] | undefined>>) => {
    onCommand(createSetNodeEventsCommand(pageId, node.id, patch));
  };

  const commitEventOptions = (patch: Partial<Record<EventName, EventOptions | undefined>>) => {
    onCommand(createSetNodeEventOptionsCommand(pageId, node.id, patch));
  };

  const addInteraction = (eventName: EventName, actionType: ActionStepType) => {
    const existing = node.events?.[eventName] ?? [];
    commitEvents({ [eventName]: [...existing, defaultStepForType(actionType)] });
    if (!node.eventOptions?.[eventName]) {
      commitEventOptions({ [eventName]: DEFAULT_EVENT_OPTIONS });
    }
    setSelectedEvent(eventName);
  };

  const removeInteraction = (eventName: EventName) => {
    commitEvents({ [eventName]: undefined });
    commitEventOptions({ [eventName]: undefined });
    if (selectedEvent === eventName) {
      setSelectedEvent(configuredEvents.find((entry) => entry !== eventName) ?? null);
    }
  };

  const updatePrimaryStep = (eventName: EventName, step: ActionStep) => {
    const existing = node.events?.[eventName] ?? [];
    if (existing.length === 0) {
      commitEvents({ [eventName]: [step] });
      return;
    }
    commitEvents({
      [eventName]: existing.map((entry, index) => (index === 0 ? step : entry)),
    });
  };

  const setStepType = (eventName: EventName, type: ActionStepType) => {
    updatePrimaryStep(eventName, defaultStepForType(type));
  };

  const selectedOptions = selectedEvent ? resolveEventOptions(node, selectedEvent) : null;
  const selectedSteps = selectedEvent ? (node.events?.[selectedEvent] ?? []) : [];
  const primaryStep = selectedSteps[0];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Interactions</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Create actions that run when a visitor interacts with this element.
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" className="h-9 w-full gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add interaction
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {ADD_INTERACTION_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={`${preset.eventName}-${preset.actionType}`}
              className="gap-2 text-xs"
              onClick={() => addInteraction(preset.eventName, preset.actionType)}
            >
              {(() => {
                const Icon = EVENT_ICONS[preset.eventName];
                return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
              })()}
              {EVENT_LABELS[preset.eventName]} → {ACTION_LABELS[preset.actionType]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {EVENT_NAMES.map((eventName) =>
            ADD_INTERACTION_PRESETS.some((preset) => preset.eventName === eventName) ? null : (
              <DropdownMenuItem
                key={eventName}
                className="gap-2 text-xs"
                onClick={() => addInteraction(eventName, "notify")}
              >
                {(() => {
                  const Icon = EVENT_ICONS[eventName];
                  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
                })()}
                {EVENT_LABELS[eventName]}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {configuredEvents.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          No interactions yet. Add one to run actions on click, submit, or change.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          {configuredEvents.map((eventName, index) => {
            const Icon = EVENT_ICONS[eventName];
            const steps = node.events?.[eventName] ?? [];
            const step = steps[0];
            const options = resolveEventOptions(node, eventName);
            const enabled = options.enabled !== false;
            const isSelected = selectedEvent === eventName;

            return (
              <div
                key={eventName}
                className={cn(
                  index > 0 && "border-t border-border",
                  isSelected && "bg-muted/20",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setSelectedEvent(eventName)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{EVENT_LABELS[eventName]}</span>
                  </button>
                  <Switch
                    checked={enabled}
                    aria-label={`${EVENT_LABELS[eventName]} enabled`}
                    className="data-[state=checked]:bg-primary"
                    onCheckedChange={(checked) =>
                      commitEventOptions({
                        [eventName]: { ...options, enabled: checked },
                      })
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${EVENT_LABELS[eventName]} menu`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-xs text-destructive focus:text-destructive"
                        onClick={() => removeInteraction(eventName)}
                      >
                        Delete interaction
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {step ? (
                  <div className="space-y-2 border-t border-border/70 px-3 py-2.5">
                    <InteractionField
                      label="Action"
                      value={
                        <Select
                          value={step.type}
                          onValueChange={(value) =>
                            setStepType(eventName, value as ActionStepType)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_STEP_TYPES.map((type) => (
                              <SelectItem key={type} value={type} className="text-xs">
                                {ACTION_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />
                    <InteractionField
                      label="Target"
                      value={
                        <TargetEditor
                          step={step}
                          nodesById={nodesById}
                          onChange={(next) => updatePrimaryStep(eventName, next)}
                        />
                      }
                    />
                    {steps.length > 1 ? (
                      <p className="text-[10px] text-muted-foreground">
                        +{steps.length - 1} more step{steps.length - 1 === 1 ? "" : "s"} run after this one
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {selectedEvent && selectedOptions && primaryStep ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Event properties</h4>
            <p className="text-[11px] text-muted-foreground">
              These settings apply to the selected interaction.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Throttle</Label>
            <Select
              value={String(selectedOptions.throttleMs ?? 0)}
              onValueChange={(value) =>
                commitEventOptions({
                  [selectedEvent]: {
                    ...selectedOptions,
                    throttleMs: Number(value),
                  },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THROTTLE_MS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Prevent default</span>
            <Switch
              checked={selectedOptions.preventDefault !== false}
              aria-label="Prevent default"
              className="data-[state=checked]:bg-primary"
              onCheckedChange={(checked) =>
                commitEventOptions({
                  [selectedEvent]: { ...selectedOptions, preventDefault: checked },
                })
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Stop propagation</span>
            <Switch
              checked={selectedOptions.stopPropagation === true}
              aria-label="Stop propagation"
              className="data-[state=checked]:bg-primary"
              onCheckedChange={(checked) =>
                commitEventOptions({
                  [selectedEvent]: { ...selectedOptions, stopPropagation: checked },
                })
              }
            />
          </label>
        </div>
      ) : null}

      {/* WEBFLOW-DEV-REF: replace with internal interactions docs before release */}
      <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">Need help?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Interactions documentation is coming soon.
        </p>
      </div>
    </div>
  );
}

function InteractionField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}

function TargetEditor({
  step,
  nodesById,
  onChange,
}: {
  readonly step: ActionStep;
  readonly nodesById: ReadonlyMap<string, BuilderNode>;
  readonly onChange: (step: ActionStep) => void;
}) {
  if (step.type === "openModal" || step.type === "closeModal") {
    const nodeChoices = [...nodesById.values()];
    return (
      <Select
        value={step.nodeId || undefined}
        onValueChange={(value) => onChange({ ...step, nodeId: value })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Choose target…" />
        </SelectTrigger>
        <SelectContent>
          {nodeChoices.map((entry) => (
            <SelectItem key={entry.id} value={entry.id} className="text-xs">
              {entry.name ?? entry.type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (step.type === "notify") {
    return (
      <Input
        className="h-8 text-xs"
        placeholder="Message"
        value={typeof step.message === "string" ? step.message : step.message.$bind}
        onChange={(event) => onChange({ ...step, message: event.target.value })}
      />
    );
  }

  if (step.type === "setVariable") {
    return (
      <Input
        className="h-8 text-xs"
        placeholder="Variable name"
        value={step.name}
        onChange={(event) => onChange({ ...step, name: event.target.value })}
      />
    );
  }

  if (step.type === "submitForm") {
    return (
      <Input
        className="h-8 text-xs"
        placeholder="Resource name"
        value={step.resource}
        onChange={(event) => onChange({ ...step, resource: event.target.value })}
      />
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      placeholder="URL or path"
      value={typeof step.to === "string" ? step.to : step.to.$bind}
      onChange={(event) => onChange({ ...step, to: event.target.value })}
    />
  );
}
