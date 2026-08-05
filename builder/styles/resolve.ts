import type { CSSProperties } from "react";
import { defaultTokens } from "./tokens";
import type { Breakpoint, DesignTokens, NodeStyleRules } from "./types";

const BREAKPOINT_ORDER: readonly Breakpoint[] = ["base", "sm", "md", "lg"];

function breakpointsUpTo(breakpoint: Breakpoint): readonly Breakpoint[] {
  const index = BREAKPOINT_ORDER.indexOf(breakpoint);
  if (index === -1) {
    return ["base"];
  }
  return BREAKPOINT_ORDER.slice(0, index + 1);
}

/**
 * Mobile-first cascade (ADR-004): merge `base`, then each breakpoint up to
 * and including the requested one. Token references must already be
 * concrete CSS values in NodeStyleRules — resolution happens when styles
 * are set, not here.
 */
export function resolveNodeStyle(
  styles: NodeStyleRules,
  breakpoint: Breakpoint,
  _tokens: DesignTokens = defaultTokens,
): CSSProperties {
  const merged: Record<string, string | number> = {};

  for (const bp of breakpointsUpTo(breakpoint)) {
    const declaration = styles[bp];
    if (!declaration) {
      continue;
    }
    for (const [property, value] of Object.entries(declaration)) {
      merged[property] = value;
    }
  }

  return merged;
}
