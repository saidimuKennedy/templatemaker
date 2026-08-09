"use client";

import { useCallback, useMemo, useRef, type SyntheticEvent } from "react";
import type { ActionStep, EventName, EventOptions } from "../actions/types";
import { useBuilderRuntime } from "./BuilderRuntime";

export type NodeEvents = Readonly<
  Partial<Record<EventName, readonly ActionStep[]>>
>;

export type NodeEventOptions = Readonly<
  Partial<Record<EventName, EventOptions>>
>;

export type NodeEventHandlers = Partial<
  Record<EventName, (event: SyntheticEvent) => void>
>;

export function readNodeEvents(
  props: Record<string, unknown>,
): NodeEvents | undefined {
  const events = props.events;
  if (!events || typeof events !== "object" || Array.isArray(events)) {
    return undefined;
  }
  return events as NodeEvents;
}

export function readNodeEventOptions(
  props: Record<string, unknown>,
): NodeEventOptions | undefined {
  const eventOptions = props.eventOptions;
  if (!eventOptions || typeof eventOptions !== "object" || Array.isArray(eventOptions)) {
    return undefined;
  }
  return eventOptions as NodeEventOptions;
}

function shouldPreventDefault(
  eventName: EventName,
  options: EventOptions | undefined,
): boolean {
  if (options?.preventDefault !== undefined) {
    return options.preventDefault;
  }
  return eventName === "onClick" || eventName === "onSubmit";
}

function createThrottledHandler(
  handler: (event: SyntheticEvent) => void,
  throttleMs: number,
): (event: SyntheticEvent) => void {
  if (throttleMs <= 0) {
    return handler;
  }
  let lastRun = 0;
  return (event: SyntheticEvent) => {
    const now = Date.now();
    if (now - lastRun < throttleMs) {
      return;
    }
    lastRun = now;
    handler(event);
  };
}

function useEventHandler(
  eventName: EventName,
  steps: readonly ActionStep[] | undefined,
  options: EventOptions | undefined,
  runSteps: (steps: readonly ActionStep[]) => Promise<void>,
): ((event: SyntheticEvent) => void) | undefined {
  const handler = useCallback(
    (event: SyntheticEvent) => {
      if (!steps || steps.length === 0 || options?.enabled === false) {
        return;
      }
      if (shouldPreventDefault(eventName, options)) {
        event.preventDefault();
      }
      if (options?.stopPropagation) {
        event.stopPropagation();
      }
      void runSteps(steps);
    },
    [eventName, options, runSteps, steps],
  );

  const throttleMs = options?.throttleMs ?? 0;
  const throttledRef = useRef<(event: SyntheticEvent) => void>(handler);
  throttledRef.current = createThrottledHandler(handler, throttleMs);

  return useCallback((event: SyntheticEvent) => throttledRef.current(event), []);
}

export function useNodeEventHandlers(
  events: NodeEvents | undefined,
  eventOptions: NodeEventOptions | undefined,
): NodeEventHandlers {
  const { runSteps } = useBuilderRuntime();

  const onClickHandler = useEventHandler(
    "onClick",
    events?.onClick,
    eventOptions?.onClick,
    runSteps,
  );
  const onSubmitHandler = useEventHandler(
    "onSubmit",
    events?.onSubmit,
    eventOptions?.onSubmit,
    runSteps,
  );
  const onChangeHandler = useEventHandler(
    "onChange",
    events?.onChange,
    eventOptions?.onChange,
    runSteps,
  );

  return useMemo(() => {
    const handlers: NodeEventHandlers = {};
    if (events?.onClick?.length) {
      handlers.onClick = onClickHandler;
    }
    if (events?.onSubmit?.length) {
      handlers.onSubmit = onSubmitHandler;
    }
    if (events?.onChange?.length) {
      handlers.onChange = onChangeHandler;
    }
    return handlers;
  }, [
    events?.onChange,
    events?.onClick,
    events?.onSubmit,
    onChangeHandler,
    onClickHandler,
    onSubmitHandler,
  ]);
}
