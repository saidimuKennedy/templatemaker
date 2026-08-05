/**
 * Style Engine types (docs/02-core-architecture.md, engine spec §4).
 *
 * A BuilderNode.styles value is typed as the wider NodeStyles =
 * Record<string, unknown> in builder/document/types.ts so the document
 * model does not depend on this subsystem. Inside builder/styles/, treat
 * node.styles as NodeStyleRules.
 */

import type { CSSProperties } from "react";

export type Breakpoint = "base" | "sm" | "md" | "lg";

export interface DesignTokens {
  readonly colors: Record<string, string>;
  readonly spacing: Record<string, string>;
  readonly typography: Record<
    string,
    { fontSize: string; fontWeight?: string | number; lineHeight?: string }
  >;
}

/** Per-breakpoint style declarations keyed by CSS property name. */
export interface ResolvedStyleDeclaration {
  readonly [cssProperty: string]: string | number;
}

export type NodeStyleRules = Partial<Record<Breakpoint, ResolvedStyleDeclaration>>;

/** Props bag shape after style resolution is merged in at render time. */
export interface StyledProps {
  readonly style: CSSProperties;
}
