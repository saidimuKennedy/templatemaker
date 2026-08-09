import type { BuilderNode, PageId } from "../document/types";
import type { ActionStep, EventName } from "../actions/types";
import type { Command } from "../history/types";

export function createUpdatePropsCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command {
  return {
    type: "UpdateProps",
    payload: {
      pageId,
      nodeId: node.id,
      props: { [key]: value },
    },
  };
}

export function createUpdateStylesCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command {
  return {
    type: "UpdateStyles",
    payload: {
      pageId,
      nodeId: node.id,
      styles: { [key]: value },
    },
  };
}

function normalizeNodeName(name: string): string | undefined {
  const trimmed = name.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function createRenameNodeCommand(
  pageId: PageId,
  node: BuilderNode,
  name: string,
): Command {
  return {
    type: "RenameNode",
    payload: {
      pageId,
      nodeId: node.id,
      name: normalizeNodeName(name),
    },
  };
}

export function createSetNodeEventsCommand(
  pageId: PageId,
  nodeId: string,
  events: Readonly<Partial<Record<EventName, readonly ActionStep[] | undefined>>>,
): Command {
  return {
    type: "SetNodeEvents",
    payload: { pageId, nodeId, events },
  };
}

export function createSetNodeEventOptionsCommand(
  pageId: PageId,
  nodeId: string,
  eventOptions: Readonly<Partial<Record<EventName, import("../actions/types").EventOptions | undefined>>>,
): Command {
  return {
    type: "SetNodeEventOptions",
    payload: { pageId, nodeId, eventOptions },
  };
}

export function createSetPropBindingCommand(
  pageId: PageId,
  nodeId: string,
  key: string,
  bindPath: string,
  fallback?: unknown,
): Command {
  return {
    type: "SetPropBinding",
    payload: { pageId, nodeId, key, bindPath, fallback },
  };
}

export function createClearPropBindingCommand(
  pageId: PageId,
  nodeId: string,
  key: string,
  literalValue: unknown,
): Command {
  return {
    type: "ClearPropBinding",
    payload: { pageId, nodeId, key, literalValue },
  };
}
