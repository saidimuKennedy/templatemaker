import type { BuilderNode, NodeProps } from "../document/types";
import type { ComponentDefinition, ComponentRenderer } from "../registry/types";

/** True when a node declares at least one event handler. */
export function nodeHasEvents(node: BuilderNode): boolean {
  return Boolean(node.events && Object.keys(node.events).length > 0);
}

/**
 * Chooses between a component's server and client renderer, and forwards the
 * node's `events` to the client one.
 *
 * Only serializable values may cross the server/client boundary, so handlers
 * are never built here — the client renderer receives the declarative `events`
 * bag and builds its own via `useNodeEventHandlers`.
 *
 * A node with events whose component declares no `clientRenderer` degrades to
 * the static renderer: the markup is still correct, the actions simply do not
 * fire. That is deliberate — a missing client variant must not blank the page.
 */
export function selectRenderer(
  node: BuilderNode,
  definition: ComponentDefinition,
  props: NodeProps,
  enableRuntime: boolean,
): { readonly Component: ComponentRenderer; readonly props: NodeProps } {
  if (enableRuntime && nodeHasEvents(node) && definition.clientRenderer) {
    return {
      Component: definition.clientRenderer,
      props: { ...props, events: node.events, eventOptions: node.eventOptions },
    };
  }
  return { Component: definition.renderer, props };
}
