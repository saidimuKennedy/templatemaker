"use client";

import { readNodeEvents, useNodeEventHandlers } from "../runtime/use-node-events";
import { ButtonView, readButtonProps } from "./button-view";

/**
 * Interactive Button. Used only when a node declares `events` and the client
 * runtime is enabled — see `ComponentDefinition.clientRenderer`.
 */
export function ButtonClientRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const handlers = useNodeEventHandlers(readNodeEvents(props));

  return <ButtonView {...readButtonProps(id, props)} onClick={handlers.onClick} />;
}
