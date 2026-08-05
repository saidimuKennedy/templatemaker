/**
 * Component Registry contracts (docs/05-component-and-plugin-specification.md,
 * ADR-003).
 *
 * A ComponentDefinition is metadata plus a renderer; the registry is
 * where the editor learns what components exist. The engine never
 * hardcodes a component type.
 */

import type { NodeProps } from "../document/types";
import type { ComponentType } from "react";

export type ComponentCategory =
  | "Layout"
  | "Content"
  | "Interaction"
  | "Business"
  | "Navigation";

/** A single editable property on a component, driving the Property Engine. */
export interface PropertyField {
  readonly key: string;
  readonly label: string;
  readonly type:
    | "string"
    | "number"
    | "boolean"
    | "color"
    | "image"
    | "select"
    | "richtext";
  /** Required for type: "select". */
  readonly options?: readonly { label: string; value: string }[];
  readonly defaultValue?: unknown;
}

/** The editable property schema for a component type. */
export type PropertySchema = readonly PropertyField[];

/**
 * Constraints on where a node of this component type may live, and what
 * it may contain. Enforced by commands (CreateNode, MoveNode), not by
 * the canvas or renderer.
 */
export interface NodeConstraints {
  /** Component types allowed as a parent. Omit/undefined = any. */
  readonly allowedParents?: readonly string[];
  /** Component types allowed as children. Omit/undefined = any. Empty = none (leaf). */
  readonly allowedChildren?: readonly string[];
}

/**
 * The renderer for a single component type: a pure function of props and
 * children to React output. See builder/renderer for how this is
 * invoked against a full document.
 */
export type ComponentRenderer = ComponentType<{
  readonly id: string;
  readonly props: NodeProps;
  readonly children?: React.ReactNode;
}>;

/**
 * Full contract every component must provide to register itself
 * (docs/05, "Component Contract").
 */
export interface ComponentDefinition {
  /** Unique component type name, referenced by BuilderNode.type. */
  readonly type: string;
  readonly category: ComponentCategory;
  readonly icon: ComponentType;
  readonly renderer: ComponentRenderer;
  readonly defaultProps: NodeProps;
  readonly propertySchema: PropertySchema;
  readonly constraints: NodeConstraints;
}

/** The registry surface consumed by the toolbox, canvas, and renderer. */
export interface ComponentRegistry {
  register(definition: ComponentDefinition): void;
  get(type: string): ComponentDefinition | undefined;
  has(type: string): boolean;
  list(): readonly ComponentDefinition[];
  listByCategory(category: ComponentCategory): readonly ComponentDefinition[];
}
