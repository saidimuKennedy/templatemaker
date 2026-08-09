/**
 * Command API implementation (docs/04-engine-specification.md, ADR-001).
 * Every mutation is applied here; nothing else rewrites a BuilderDocument.
 */

import type { BuilderDocument, BuilderPage, NodeProps, NodeStyles, PageId } from "../document/types";
import { findNodeAndParent, insertNode, removeNode, updateNode } from "../document/tree";
import type {
  Command,
  CommandApplyResult,
  CommandEngine,
  CompositePayload,
  CreateNodePayload,
  CreatePagePayload,
  DeleteNodePayload,
  DeletePagePayload,
  MoveNodePayload,
  RenameNodePayload,
  ReorderPagePayload,
  SetNodeEventsPayload,
  SetNodeEventOptionsPayload,
  SetPropBindingPayload,
  ClearPropBindingPayload,
  DeleteResourcePayload,
  UpdatePagePayload,
  UpdatePropsPayload,
  UpdateStylesPayload,
  UpsertResourcePayload,
} from "./types";
import type { EventName } from "../actions/types";
import { isBinding } from "../bindings/types";
import { normalizePagePath } from "../pages/normalize-path";

function normalizeNodeName(name: string | undefined): string | undefined {
  if (name === undefined) return undefined;
  const trimmed = name.trim();
  return trimmed === "" ? undefined : trimmed;
}

function getPage(document: BuilderDocument, pageId: PageId): BuilderPage {
  const page = document.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Page "${pageId}" not found.`);
  return page;
}

function replacePage(document: BuilderDocument, pageId: PageId, root: BuilderPage["root"]): BuilderDocument {
  return {
    ...document,
    pages: document.pages.map((p) => (p.id === pageId ? { ...p, root } : p)),
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyCreateNode(document: BuilderDocument, payload: CreateNodePayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = insertNode(page.root, payload.parentId, payload.node, payload.index);
  if (!newRoot) {
    throw new Error(`Parent node "${payload.parentId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyDeleteNode(document: BuilderDocument, payload: DeleteNodePayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  if (page.root.id === payload.nodeId) {
    throw new Error("Cannot delete a page's root node.");
  }
  const removed = removeNode(page.root, payload.nodeId);
  if (!removed) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, removed.tree);
}

function applyMoveNode(document: BuilderDocument, payload: MoveNodePayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  if (page.root.id === payload.nodeId) {
    throw new Error("Cannot move a page's root node.");
  }
  const removed = removeNode(page.root, payload.nodeId);
  if (!removed) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  const newRoot = insertNode(removed.tree, payload.newParentId, removed.removed, payload.newIndex);
  if (!newRoot) {
    throw new Error(
      `Target parent "${payload.newParentId}" not found (it may be the moved node itself or one of its descendants).`,
    );
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyUpdateProps(document: BuilderDocument, payload: UpdatePropsPayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    props: { ...node.props, ...payload.props },
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyUpdateStyles(document: BuilderDocument, payload: UpdateStylesPayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    styles: { ...node.styles, ...payload.styles },
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyRenameNode(document: BuilderDocument, payload: RenameNodePayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const normalizedName = normalizeNodeName(payload.name);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    name: normalizedName,
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function assertUniquePagePath(document: BuilderDocument, path: string, excludePageId?: PageId): void {
  const normalized = normalizePagePath(path);
  const duplicate = document.pages.find(
    (page) => page.id !== excludePageId && normalizePagePath(page.path) === normalized,
  );
  if (duplicate) {
    throw new Error(`Page path "${normalized}" is already used by page "${duplicate.name}".`);
  }
}

function applyCreatePage(document: BuilderDocument, payload: CreatePagePayload): BuilderDocument {
  assertUniquePagePath(document, payload.page.path);
  const pages = [...document.pages];
  const index = payload.index ?? pages.length;
  if (index < 0 || index > pages.length) {
    throw new Error(`Page index ${index} is out of range.`);
  }
  if (pages.some((page) => page.id === payload.page.id)) {
    throw new Error(`Page id "${payload.page.id}" already exists.`);
  }
  pages.splice(index, 0, payload.page);
  return {
    ...document,
    pages,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyDeletePage(document: BuilderDocument, payload: DeletePagePayload): BuilderDocument {
  if (document.pages.length <= 1) {
    throw new Error("Cannot delete the last remaining page.");
  }
  const index = document.pages.findIndex((page) => page.id === payload.pageId);
  if (index === -1) {
    throw new Error(`Page "${payload.pageId}" not found.`);
  }
  const pages = document.pages.filter((page) => page.id !== payload.pageId);
  return {
    ...document,
    pages,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyUpdatePage(document: BuilderDocument, payload: UpdatePagePayload): BuilderDocument {
  const page = document.pages.find((entry) => entry.id === payload.pageId);
  if (!page) {
    throw new Error(`Page "${payload.pageId}" not found.`);
  }
  const nextPath = payload.path !== undefined ? normalizePagePath(payload.path) : page.path;
  if (payload.path !== undefined) {
    assertUniquePagePath(document, nextPath, payload.pageId);
  }
  const pages = document.pages.map((entry) =>
    entry.id === payload.pageId
      ? {
          ...entry,
          ...(payload.name !== undefined ? { name: payload.name.trim() || entry.name } : {}),
          ...(payload.path !== undefined ? { path: nextPath } : {}),
        }
      : entry,
  );
  return {
    ...document,
    pages,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyReorderPage(document: BuilderDocument, payload: ReorderPagePayload): BuilderDocument {
  const currentIndex = document.pages.findIndex((page) => page.id === payload.pageId);
  if (currentIndex === -1) {
    throw new Error(`Page "${payload.pageId}" not found.`);
  }
  if (payload.newIndex < 0 || payload.newIndex >= document.pages.length) {
    throw new Error(`Page index ${payload.newIndex} is out of range.`);
  }
  const pages = [...document.pages];
  const [moved] = pages.splice(currentIndex, 1);
  pages.splice(payload.newIndex, 0, moved);
  return {
    ...document,
    pages,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function mergeNodeEvents(
  existing: import("../document/types").BuilderNode["events"],
  patch: SetNodeEventsPayload["events"],
): import("../document/types").BuilderNode["events"] {
  const next: Partial<Record<EventName, readonly import("../actions/types").ActionStep[]>> = {
    ...(existing ?? {}),
  };
  for (const [key, value] of Object.entries(patch) as [EventName, readonly import("../actions/types").ActionStep[] | undefined][]) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0
    ? (next as NonNullable<import("../document/types").BuilderNode["events"]>)
    : undefined;
}

function mergeNodeEventOptions(
  existing: import("../document/types").BuilderNode["eventOptions"],
  patch: SetNodeEventOptionsPayload["eventOptions"],
): import("../document/types").BuilderNode["eventOptions"] {
  const next: Partial<Record<EventName, import("../actions/types").EventOptions>> = {
    ...(existing ?? {}),
  };
  for (const [key, value] of Object.entries(patch) as [EventName, import("../actions/types").EventOptions | undefined][]) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0
    ? (next as NonNullable<import("../document/types").BuilderNode["eventOptions"]>)
    : undefined;
}

function applySetNodeEvents(document: BuilderDocument, payload: SetNodeEventsPayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    events: mergeNodeEvents(node.events, payload.events),
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applySetNodeEventOptions(
  document: BuilderDocument,
  payload: SetNodeEventOptionsPayload,
): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    eventOptions: mergeNodeEventOptions(node.eventOptions, payload.eventOptions),
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applySetPropBinding(document: BuilderDocument, payload: SetPropBindingPayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const binding = {
    $bind: payload.bindPath,
    ...(payload.fallback !== undefined ? { fallback: payload.fallback } : {}),
  };
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    props: { ...node.props, [payload.key]: binding },
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyClearPropBinding(document: BuilderDocument, payload: ClearPropBindingPayload): BuilderDocument {
  const page = getPage(document, payload.pageId);
  const newRoot = updateNode(page.root, payload.nodeId, (node) => ({
    ...node,
    props: { ...node.props, [payload.key]: payload.literalValue },
  }));
  if (!newRoot) {
    throw new Error(`Node "${payload.nodeId}" not found on page "${payload.pageId}".`);
  }
  return replacePage(document, payload.pageId, newRoot);
}

function applyUpsertResource(document: BuilderDocument, payload: UpsertResourcePayload): BuilderDocument {
  const resources = [...(document.resources ?? [])];
  const index = resources.findIndex((entry) => entry.name === payload.resource.name);
  if (index === -1) {
    resources.push(payload.resource);
  } else {
    resources[index] = payload.resource;
  }
  return {
    ...document,
    resources,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyDeleteResource(document: BuilderDocument, payload: DeleteResourcePayload): BuilderDocument {
  const resources = (document.resources ?? []).filter((entry) => entry.name !== payload.name);
  return {
    ...document,
    resources: resources.length > 0 ? resources : undefined,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

function applyComposite(document: BuilderDocument, payload: CompositePayload): BuilderDocument {
  let currentDocument = document;
  const applied: Command[] = [];
  try {
    for (const command of payload.commands) {
      currentDocument = applyCommand(currentDocument, command);
      applied.push(command);
    }
    return currentDocument;
  } catch (error) {
    let rollbackDocument = document;
    for (let index = applied.length - 1; index >= 0; index -= 1) {
      const inverse = invertCommand(rollbackDocument, applied[index]!);
      rollbackDocument = applyCommand(rollbackDocument, inverse);
    }
    throw error;
  }
}

function applyCommand(document: BuilderDocument, command: Command): BuilderDocument {
  switch (command.type) {
    case "CreateNode":
      return applyCreateNode(document, command.payload);
    case "MoveNode":
      return applyMoveNode(document, command.payload);
    case "DeleteNode":
      return applyDeleteNode(document, command.payload);
    case "UpdateProps":
      return applyUpdateProps(document, command.payload);
    case "UpdateStyles":
      return applyUpdateStyles(document, command.payload);
    case "RenameNode":
      return applyRenameNode(document, command.payload);
    case "Composite":
      return applyComposite(document, command.payload);
    case "CreatePage":
      return applyCreatePage(document, command.payload);
    case "DeletePage":
      return applyDeletePage(document, command.payload);
    case "UpdatePage":
      return applyUpdatePage(document, command.payload);
    case "ReorderPage":
      return applyReorderPage(document, command.payload);
    case "SetNodeEvents":
      return applySetNodeEvents(document, command.payload);
    case "SetNodeEventOptions":
      return applySetNodeEventOptions(document, command.payload);
    case "SetPropBinding":
      return applySetPropBinding(document, command.payload);
    case "ClearPropBinding":
      return applyClearPropBinding(document, command.payload);
    case "UpsertResource":
      return applyUpsertResource(document, command.payload);
    case "DeleteResource":
      return applyDeleteResource(document, command.payload);
  }
}

/** Computes the inverse of `command` using the document state it is about to be applied to. */
function invertCommand(document: BuilderDocument, command: Command): Command {
  switch (command.type) {
    case "CreateNode": {
      return { type: "DeleteNode", payload: { pageId: command.payload.pageId, nodeId: command.payload.node.id } };
    }
    case "DeleteNode": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found || !found.parent) {
        throw new Error(`Cannot invert DeleteNode: node "${command.payload.nodeId}" not found.`);
      }
      return {
        type: "CreateNode",
        payload: {
          pageId: command.payload.pageId,
          parentId: found.parent.id,
          index: found.index,
          node: found.node,
        },
      };
    }
    case "MoveNode": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found || !found.parent) {
        throw new Error(`Cannot invert MoveNode: node "${command.payload.nodeId}" not found.`);
      }
      return {
        type: "MoveNode",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          newParentId: found.parent.id,
          newIndex: found.index,
        },
      };
    }
    case "UpdateProps": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert UpdateProps: node "${command.payload.nodeId}" not found.`);
      }
      const previous: NodeProps = {};
      for (const key of Object.keys(command.payload.props)) previous[key] = found.node.props[key];
      return {
        type: "UpdateProps",
        payload: { pageId: command.payload.pageId, nodeId: command.payload.nodeId, props: previous },
      };
    }
    case "UpdateStyles": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert UpdateStyles: node "${command.payload.nodeId}" not found.`);
      }
      const previous: NodeStyles = {};
      for (const key of Object.keys(command.payload.styles)) previous[key] = found.node.styles[key];
      return {
        type: "UpdateStyles",
        payload: { pageId: command.payload.pageId, nodeId: command.payload.nodeId, styles: previous },
      };
    }
    case "RenameNode": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert RenameNode: node "${command.payload.nodeId}" not found.`);
      }
      return {
        type: "RenameNode",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          name: found.node.name,
        },
      };
    }
    case "Composite": {
      let workingDocument = document;
      const inverses: Command[] = [];
      for (const subcommand of command.payload.commands) {
        inverses.push(invertCommand(workingDocument, subcommand));
        workingDocument = applyCommand(workingDocument, subcommand);
      }
      return { type: "Composite", payload: { commands: inverses.reverse() } };
    }
    case "CreatePage": {
      return { type: "DeletePage", payload: { pageId: command.payload.page.id } };
    }
    case "DeletePage": {
      const page = document.pages.find((entry) => entry.id === command.payload.pageId);
      if (!page) {
        throw new Error(`Cannot invert DeletePage: page "${command.payload.pageId}" not found.`);
      }
      const index = document.pages.findIndex((entry) => entry.id === command.payload.pageId);
      return { type: "CreatePage", payload: { page, index } };
    }
    case "UpdatePage": {
      const page = document.pages.find((entry) => entry.id === command.payload.pageId);
      if (!page) {
        throw new Error(`Cannot invert UpdatePage: page "${command.payload.pageId}" not found.`);
      }
      return {
        type: "UpdatePage",
        payload: {
          pageId: command.payload.pageId,
          ...(command.payload.name !== undefined ? { name: page.name } : {}),
          ...(command.payload.path !== undefined ? { path: page.path } : {}),
        },
      };
    }
    case "ReorderPage": {
      const currentIndex = document.pages.findIndex((entry) => entry.id === command.payload.pageId);
      if (currentIndex === -1) {
        throw new Error(`Cannot invert ReorderPage: page "${command.payload.pageId}" not found.`);
      }
      return {
        type: "ReorderPage",
        payload: { pageId: command.payload.pageId, newIndex: currentIndex },
      };
    }
    case "SetNodeEvents": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert SetNodeEvents: node "${command.payload.nodeId}" not found.`);
      }
      const previous: SetNodeEventsPayload["events"] = {};
      for (const key of Object.keys(command.payload.events) as EventName[]) {
        (previous as Record<EventName, readonly import("../actions/types").ActionStep[] | undefined>)[key] =
          found.node.events?.[key];
      }
      return {
        type: "SetNodeEvents",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          events: previous,
        },
      };
    }
    case "SetNodeEventOptions": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(
          `Cannot invert SetNodeEventOptions: node "${command.payload.nodeId}" not found.`,
        );
      }
      const previous: SetNodeEventOptionsPayload["eventOptions"] = {};
      for (const key of Object.keys(command.payload.eventOptions) as EventName[]) {
        (previous as Record<EventName, import("../actions/types").EventOptions | undefined>)[key] =
          found.node.eventOptions?.[key];
      }
      return {
        type: "SetNodeEventOptions",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          eventOptions: previous,
        },
      };
    }
    case "SetPropBinding": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert SetPropBinding: node "${command.payload.nodeId}" not found.`);
      }
      const current = found.node.props[command.payload.key];
      if (isBinding(current)) {
        return {
          type: "SetPropBinding",
          payload: {
            pageId: command.payload.pageId,
            nodeId: command.payload.nodeId,
            key: command.payload.key,
            bindPath: current.$bind,
            fallback: current.fallback,
          },
        };
      }
      return {
        type: "ClearPropBinding",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          key: command.payload.key,
          literalValue: current,
        },
      };
    }
    case "ClearPropBinding": {
      const page = getPage(document, command.payload.pageId);
      const found = findNodeAndParent(page.root, command.payload.nodeId);
      if (!found) {
        throw new Error(`Cannot invert ClearPropBinding: node "${command.payload.nodeId}" not found.`);
      }
      const current = found.node.props[command.payload.key];
      if (isBinding(current)) {
        return {
          type: "SetPropBinding",
          payload: {
            pageId: command.payload.pageId,
            nodeId: command.payload.nodeId,
            key: command.payload.key,
            bindPath: current.$bind,
            fallback: current.fallback,
          },
        };
      }
      return {
        type: "ClearPropBinding",
        payload: {
          pageId: command.payload.pageId,
          nodeId: command.payload.nodeId,
          key: command.payload.key,
          literalValue: current,
        },
      };
    }
    case "UpsertResource": {
      const previous = document.resources?.find((entry) => entry.name === command.payload.resource.name);
      if (previous) {
        return { type: "UpsertResource", payload: { resource: previous } };
      }
      return { type: "DeleteResource", payload: { name: command.payload.resource.name } };
    }
    case "DeleteResource": {
      const previous = document.resources?.find((entry) => entry.name === command.payload.name);
      if (!previous) {
        throw new Error(`Cannot invert DeleteResource: resource "${command.payload.name}" not found.`);
      }
      return { type: "UpsertResource", payload: { resource: previous } };
    }
  }
}

export function createCommandEngine(): CommandEngine {
  return {
    apply(document: BuilderDocument, command: Command): CommandApplyResult {
      try {
        const nextDocument = applyCommand(document, command);
        return { ok: true, result: { document: nextDocument, command } };
      } catch (error) {
        return {
          ok: false,
          error: { command, message: error instanceof Error ? error.message : String(error) },
        };
      }
    },
    invert(document: BuilderDocument, command: Command): Command {
      return invertCommand(document, command);
    },
  };
}
