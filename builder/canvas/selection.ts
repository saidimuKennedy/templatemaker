import type { NodeId, PageId } from "../document/types";
import type { CanvasState } from "./types";

export function select(
  state: CanvasState,
  pageId: PageId,
  nodeId: NodeId,
  options?: { additive?: boolean; toggle?: boolean },
): CanvasState {
  const additive = options?.additive ?? false;
  const toggle = options?.toggle ?? false;

  if (
    toggle &&
    state.selection !== null &&
    state.selection.pageId === pageId &&
    state.selection.selectedNodeIds.includes(nodeId)
  ) {
    const remaining = state.selection.selectedNodeIds.filter((id) => id !== nodeId);
    if (remaining.length === 0) {
      return { ...state, selection: null };
    }
    return {
      ...state,
      selection: { pageId, selectedNodeIds: remaining },
    };
  }

  if (!additive || state.selection === null || state.selection.pageId !== pageId) {
    return {
      ...state,
      selection: { pageId, selectedNodeIds: [nodeId] },
    };
  }

  if (state.selection.selectedNodeIds.includes(nodeId)) {
    return state;
  }

  return {
    ...state,
    selection: {
      pageId,
      selectedNodeIds: [...state.selection.selectedNodeIds, nodeId],
    },
  };
}

export function clearSelection(state: CanvasState): CanvasState {
  if (state.selection === null) {
    return state;
  }
  return { ...state, selection: null };
}

export function isSelected(state: CanvasState, nodeId: NodeId): boolean {
  return state.selection?.selectedNodeIds.includes(nodeId) ?? false;
}
