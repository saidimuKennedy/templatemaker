"use client";

import { useCallback, useMemo, type SyntheticEvent } from "react";
import type { ActionStep, EventName } from "../actions/types";
import { useBuilderRuntime } from "./BuilderRuntime";

export type NodeEvents = Readonly<
  Partial<Record<EventName, readonly ActionStep[]>>
>;

export type NodeEventHandlers = Partial<
  Record<EventName, (event: SyntheticEvent) => void>
>;

/**
 * Pulls the declarative `events` bag back off the resolved props.
 *
 * Events reach client renderers as *data* through props, never as handler
 * functions: only serializable values may cross the server/client boundary,
 * so the server renderer forwards `node.events` and the client renderer
 * turns it into handlers here.
 */
export function readNodeEvents(
  props: Record<string, unknown>,
): NodeEvents | undefined {
  const events = props.events;
  if (!events || typeof events !== "object" || Array.isArray(events)) {
    return undefined;
  }
  return events as NodeEvents;
}

/**
 * Builds React event handlers for a node's declared action steps. Must be
 * called from a client component inside a BuilderRuntime provider.
 */
export function useNodeEventHandlers(
  events: NodeEvents | undefined,
): NodeEventHandlers {
  const { runSteps } = useBuilderRuntime();

  const onClickSteps = events?.onClick;
  const onSubmitSteps = events?.onSubmit;
  const onChangeSteps = events?.onChange;

  const onClick = useCallback(
    (event: SyntheticEvent) => {
      if (!onClickSteps) {
        return;
      }
      event.preventDefault();
      void runSteps(onClickSteps);
    },
    [onClickSteps, runSteps],
  );

  const onSubmit = useCallback(
    (event: SyntheticEvent) => {
      if (!onSubmitSteps) {
        return;
      }
      event.preventDefault();
      void runSteps(onSubmitSteps);
    },
    [onSubmitSteps, runSteps],
  );

  const onChange = useCallback(
    (event: SyntheticEvent) => {
      if (!onChangeSteps) {
        return;
      }
      void runSteps(onChangeSteps);
    },
    [onChangeSteps, runSteps],
  );

  return useMemo(() => {
    const handlers: NodeEventHandlers = {};
    if (onClickSteps) {
      handlers.onClick = onClick;
    }
    if (onSubmitSteps) {
      handlers.onSubmit = onSubmit;
    }
    if (onChangeSteps) {
      handlers.onChange = onChange;
    }
    return handlers;
  }, [onChange, onChangeSteps, onClick, onClickSteps, onSubmit, onSubmitSteps]);
}
