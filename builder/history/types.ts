/**
 * Command API and History contracts (docs/04-engine-specification.md,
 * ADR-001, ADR-006).
 *
 * Every mutation to a BuilderDocument is a Command. Commands are applied
 * by the engine, recorded in History, and are the only path AI or the
 * canvas has to change a document — neither may write to the document
 * directly.
 */

import type {
  BuilderDocument,
  NodeId,
  NodeProps,
  NodeStyles,
  PageId,
  BuilderNode,
} from "../document/types";

export interface CreateNodePayload {
  readonly pageId: PageId;
  readonly parentId: NodeId;
  /** Index within the parent's children. Omit to append. */
  readonly index?: number;
  readonly node: BuilderNode;
}

export interface MoveNodePayload {
  readonly pageId: PageId;
  readonly nodeId: NodeId;
  readonly newParentId: NodeId;
  readonly newIndex: number;
}

export interface DeleteNodePayload {
  readonly pageId: PageId;
  readonly nodeId: NodeId;
}

export interface UpdatePropsPayload {
  readonly pageId: PageId;
  readonly nodeId: NodeId;
  /** Shallow-merged into the node's existing props. */
  readonly props: NodeProps;
}

export interface UpdateStylesPayload {
  readonly pageId: PageId;
  readonly nodeId: NodeId;
  /** Shallow-merged into the node's existing styles. */
  readonly styles: NodeStyles;
}

export interface RenameNodePayload {
  readonly pageId: PageId;
  readonly nodeId: NodeId;
  /** Omit/undefined clears the name so the Navigator falls back to node.type. */
  readonly name?: string;
}

/**
 * The closed set of mutations the engine understands. New mutation
 * kinds are added here, not by having callers bypass Command and edit
 * BuilderDocument fields directly.
 */
export type Command =
  | { readonly type: "CreateNode"; readonly payload: CreateNodePayload }
  | { readonly type: "MoveNode"; readonly payload: MoveNodePayload }
  | { readonly type: "DeleteNode"; readonly payload: DeleteNodePayload }
  | { readonly type: "UpdateProps"; readonly payload: UpdatePropsPayload }
  | { readonly type: "UpdateStyles"; readonly payload: UpdateStylesPayload }
  | { readonly type: "RenameNode"; readonly payload: RenameNodePayload };

export type CommandType = Command["type"];

export interface CommandResult {
  readonly document: BuilderDocument;
  readonly command: Command;
}

export interface CommandError {
  readonly command: Command;
  readonly message: string;
}

export type CommandApplyResult =
  | { readonly ok: true; readonly result: CommandResult }
  | { readonly ok: false; readonly error: CommandError };

/**
 * Applies commands to documents. Every command must be revertible so
 * History can implement undo without re-deriving inverse commands ad
 * hoc.
 */
export interface CommandEngine {
  apply(document: BuilderDocument, command: Command): CommandApplyResult;
  /** Produces the inverse of a command against the document it was applied to. */
  invert(document: BuilderDocument, command: Command): Command;
}

/** Undo/redo over a stack of applied commands. */
export interface History {
  push(command: Command): void;
  undo(): Command | undefined;
  redo(): Command | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}
