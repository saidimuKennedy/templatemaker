import type { BuilderDocument, NodeId, PageId } from "../document/types";
import { findNodeAndParent } from "../document/tree";
import type { Command } from "../history/types";
import type { CanvasState, DropTarget } from "./types";

export function beginDrag(state: CanvasState, nodeId: NodeId): CanvasState {
  return {
    ...state,
    dragging: { nodeId },
    dropTarget: null,
  };
}

export function updateDropTarget(state: CanvasState, target: DropTarget | null): CanvasState {
  return {
    ...state,
    dropTarget: target,
  };
}

export function resolveDropCommand(
  document: BuilderDocument,
  pageId: PageId,
  draggedNodeId: NodeId,
  drop: DropTarget,
): Command | undefined {
  if (drop.nodeId === draggedNodeId) {
    return undefined;
  }

  const page = document.pages.find((p) => p.id === pageId);
  if (!page) {
    return undefined;
  }

  const { root } = page;

  if (drop.position === "inside") {
    const target = findNodeAndParent(root, drop.nodeId);
    if (!target) {
      return undefined;
    }
    return {
      type: "MoveNode",
      payload: {
        pageId,
        nodeId: draggedNodeId,
        newParentId: drop.nodeId,
        newIndex: target.node.children.length,
      },
    };
  }

  const dropFound = findNodeAndParent(root, drop.nodeId);
  if (!dropFound || !dropFound.parent) {
    return undefined;
  }

  let newIndex = drop.position === "before" ? dropFound.index : dropFound.index + 1;
  const newParentId = dropFound.parent.id;

  const draggedFound = findNodeAndParent(root, draggedNodeId);
  if (
    draggedFound?.parent?.id === newParentId &&
    draggedFound.index !== -1 &&
    draggedFound.index < newIndex
  ) {
    newIndex -= 1;
  }

  return {
    type: "MoveNode",
    payload: {
      pageId,
      nodeId: draggedNodeId,
      newParentId,
      newIndex,
    },
  };
}

export function endDrag(state: CanvasState): CanvasState {
  return {
    ...state,
    dragging: null,
    dropTarget: null,
  };
}
