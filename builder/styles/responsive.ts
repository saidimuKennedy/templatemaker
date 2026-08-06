/**
 * Real, browser-native responsiveness for published output.
 *
 * `resolveNodeStyle` (see resolve.ts) picks ONE breakpoint and resolves it
 * to a single inline style object — that's correct for editor preview
 * (simulating "what does this look like at breakpoint X"), but it means
 * a real visitor's browser never adapts to their actual viewport width;
 * the page just renders whatever breakpoint the server happened to
 * render with. This module instead emits a real CSS stylesheet with
 * `@media (min-width: ...)` rules per non-base breakpoint, keyed off the
 * `data-node-id` attribute every rendered node already carries. Base
 * styles stay inline (applied via mergeStyleIntoProps as before); this
 * stylesheet only carries the sm/md/lg overrides, so the visitor's own
 * browser evaluates the media queries and swaps styles as their real
 * viewport crosses each breakpoint — no per-request breakpoint guessing.
 */

import type { BuilderDocument, BuilderNode } from "../document/types";
import type { NodeStyleRules, ResolvedStyleDeclaration } from "./types";

const BREAKPOINT_MIN_WIDTH: Record<"sm" | "md" | "lg", number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

function camelToKebab(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Strips characters that could break out of the CSS declaration or the
 * surrounding <style> element. Values come from the Style Engine's own
 * curated fields plus a free-text "Custom…" escape hatch in the editor
 * (see components/editor/StyleInspector.tsx) — the free-text path is
 * exactly why this can't be skipped.
 */
function sanitizeCssValue(value: string | number): string {
  return String(value).replace(/[<>{};]/g, "");
}

function sanitizeSelectorId(id: string): string {
  return id.replace(/["'\\<>{};]/g, "");
}

function declarationToCss(declaration: ResolvedStyleDeclaration): string {
  return Object.entries(declaration)
    .map(([property, value]) => `${camelToKebab(property)}:${sanitizeCssValue(value)}`)
    .join(";");
}

function collectRulesForNode(node: BuilderNode, rules: string[]): void {
  const styles = node.styles as NodeStyleRules;
  const selector = `[data-node-id="${sanitizeSelectorId(node.id)}"]`;

  (["sm", "md", "lg"] as const).forEach((breakpoint) => {
    const declaration = styles[breakpoint];
    if (declaration && Object.keys(declaration).length > 0) {
      const css = declarationToCss(declaration);
      if (css) {
        rules.push(`@media (min-width:${BREAKPOINT_MIN_WIDTH[breakpoint]}px){${selector}{${css}}}`);
      }
    }
  });

  node.children.forEach((child) => collectRulesForNode(child, rules));
}

/** Builds a `<style>`-ready CSS string covering every sm/md/lg override in the document. */
export function buildResponsiveStylesheet(document: BuilderDocument): string {
  const rules: string[] = [];
  document.pages.forEach((page) => collectRulesForNode(page.root, rules));
  return rules.join("\n");
}
