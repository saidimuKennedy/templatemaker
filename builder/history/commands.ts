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
  CreateNodePayload,
  DeleteNodePayload,
  MoveNodePayload,
  UpdatePropsPayload,
  UpdateStylesPayload,
} from "./types";

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
