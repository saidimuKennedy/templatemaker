/**
 * Decides whether a childless layout node gets the editor's empty-state
 * affordance (Plan 27 follow-up).
 *
 * Two things were wrong with rendering it unconditionally:
 *
 * 1. **It leaked into published output.** Components receive only
 *    `{ id, props, children }`, so they cannot tell the canvas from a live
 *    page. Published portfolios were emitting a dashed box reading
 *    "Empty Container" — visible to visitors.
 * 2. **Deliberately empty nodes are not mistakes.** The divider recipe is a
 *    Container with `height: 1px` and a background. Wrapping it in a 32px
 *    placeholder does not just mislabel it, it changes the design the author
 *    is looking at.
 *
 * Selectability still holds for the second case: the canvas gives every node
 * a `min-height: 8px` hit area (`Canvas.tsx`), so a 1px divider stays
 * clickable without being inflated.
 */

import type { CSSProperties } from "react";
import type { BuilderNode } from "../document/types";
import type { RenderTarget } from "./types";

/** Style keys that make a node visible on its own, placeholder or not. */
const SELF_SIZING_KEYS = ["height", "minHeight"] as const;

function hasSelfSizing(style: CSSProperties | undefined, node: BuilderNode): boolean {
  if (style) {
    for (const key of SELF_SIZING_KEYS) {
      const value = style[key];
      // `0` and "0px" are not self-sizing — they leave the node invisible,
      // which is exactly when the affordance is still wanted.
      if (value !== undefined && value !== 0 && value !== "0" && value !== "0px") {
        return true;
      }
    }
  }

  // The plain renderer does not resolve styles, so fall back to the authored
  // declarations. Any breakpoint counts: a node sized only at `lg` is still
  // deliberate.
  const rules = node.styles as Record<string, Record<string, unknown> | undefined>;
  for (const declaration of Object.values(rules ?? {})) {
    if (!declaration) continue;
    for (const key of SELF_SIZING_KEYS) {
      const value = declaration[key];
      if (value !== undefined && value !== 0 && value !== "0" && value !== "0px") {
        return true;
      }
    }
  }

  return false;
}

export function shouldShowEmptyPlaceholder(
  node: BuilderNode,
  target: RenderTarget,
  resolvedStyle?: CSSProperties,
): boolean {
  if (target !== "editor-preview") {
    return false;
  }
  return !hasSelfSizing(resolvedStyle, node);
}
