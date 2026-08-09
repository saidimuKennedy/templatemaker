/**
 * Document Model contracts.
 *
 * These are the core nouns of the system (docs/03-document-model.md,
 * ADR-001). A BuilderDocument is the single source of truth: no editor,
 * canvas, or AI state may exist outside of it.
 */

import type { ActionStep, EventName } from "../actions/types";

/** Opaque node identifier, unique within a BuilderProject. */
export type NodeId = string;

/** Opaque page identifier, unique within a BuilderProject. */
export type PageId = string;

/**
 * Arbitrary, component-defined props. Shape is validated against the
 * owning ComponentDefinition's prop schema, not by the document model
 * itself.
 *
 * Bindings are stored inline as `{ $bind: "scope.path", fallback? }`
 * values inside this bag — no separate document field is required
 * (ADR-012, Plan 29).
 */
export type NodeProps = Record<string, unknown>;

/**
 * Style declarations for a node. Structure is owned by the Style Engine
 * (builder/styles); the document model only requires it be a
 * serializable record, keyed by breakpoint or state as the Style Engine
 * defines.
 */
export type NodeStyles = Record<string, unknown>;

/**
 * Every element in the builder — layout, content, interactive, or
 * business — is a BuilderNode. There is no separate concept for a
 * "block", "widget", or "section" at the document level.
 */
export interface BuilderNode {
  readonly id: NodeId;
  /** Component type, resolved through the Component Registry. */
  readonly type: string;
  /**
   * Author-given label for this node, shown in the Navigator. Purely
   * presentational: nothing resolves behaviour from it, and it is never
   * rendered into published output.
   *
   * Optional because `type` is always a usable fallback — but a tree of
   * ten nodes all labelled "Stack" is unnavigable, which is the whole
   * reason the Navigator needs this. Documents authored before this
   * field existed stay valid and simply fall back to `type`.
   */
  readonly name?: string;
  readonly props: NodeProps;
  readonly styles: NodeStyles;
  readonly children: readonly BuilderNode[];
  /**
   * Declarative event handlers. Absent = no interactivity on this node.
   *
   * `Partial` is load-bearing: a node wiring only `onClick` must not be
   * required to declare `onSubmit` and `onChange` as well.
   */
  readonly events?: Readonly<Partial<Record<EventName, readonly ActionStep[]>>>;
}

/** A single page: a name/route plus a root node tree. */
export interface BuilderPage {
  readonly id: PageId;
  readonly name: string;
  readonly path: string;
  readonly root: BuilderNode;
}

/** Document-level metadata unrelated to page content. */
export interface BuilderDocumentMeta {
  readonly schemaVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * A BuilderProject is the top-level persisted unit: a collection of
 * pages plus metadata. This is what gets saved, loaded, and versioned by
 * the Document Engine.
 */
export interface BuilderProject {
  readonly id: string;
  readonly name: string;
  readonly meta: BuilderDocumentMeta;
  readonly pages: readonly BuilderPage[];
}

/**
 * A BuilderDocument is whatever unit of content an engine operation acts
 * on. In v1 this is always a BuilderProject, but callers should type
 * against BuilderDocument so the engine can widen the definition (e.g.
 * to a single detached page) without breaking consumers.
 */
export type BuilderDocument = BuilderProject;

/** Result of validating a document against the node contract and rules. */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}
