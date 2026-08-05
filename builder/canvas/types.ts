import type { NodeId, PageId } from "../document/types";

export interface CanvasSelection {
  readonly pageId: PageId;
  readonly selectedNodeIds: readonly NodeId[];
}

export type DropPosition = "before" | "after" | "inside";

export interface DropTarget {
  readonly nodeId: NodeId;
  readonly position: DropPosition;
}

export interface CanvasState {
  readonly selection: CanvasSelection | null;
  readonly hoveredNodeId: NodeId | null;
  readonly dragging: { readonly nodeId: NodeId } | null;
  readonly dropTarget: DropTarget | null;
}

export const initialCanvasState: CanvasState = {
  selection: null,
  hoveredNodeId: null,
  dragging: null,
  dropTarget: null,
};
