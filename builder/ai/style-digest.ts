/**
 * Extracts what a document's design *actually* is, so the next generation
 * matches the last one (Plan 26, Stage 1).
 *
 * Generation is section-scoped: each call re-derives styling from scratch,
 * and the model copies token values rather than referencing them. The result
 * is three pages that each invent their own radii and tints. Showing the
 * model the values already in use turns "pick something reasonable" into
 * "match this", which is a far easier instruction to follow.
 *
 * Near-misses are the specific failure this targets: `#f8fafc` beside
 * `#f9fafb` reads as a mistake, where two clearly different colours read as
 * a choice.
 */

import type { BuilderDocument, BuilderNode } from "../document/types";
import { STYLE_FIELDS } from "../styles/fields";

/** Values per category kept in the digest. Enough to be useful, short enough
 *  not to crowd out the recipes or eat the output token budget. */
const MAX_VALUES_PER_CATEGORY = 6;

const COLOR_KEYS = new Set(
  STYLE_FIELDS.filter((field) => field.kind === "color").map((field) => field.key),
);

const RADIUS_KEYS = new Set(["borderRadius"]);

const SPACING_KEYS = new Set(
  STYLE_FIELDS.filter((field) => field.kind === "spacing").map((field) => field.key),
);

const FONT_SIZE_KEYS = new Set(["fontSize"]);
const FONT_WEIGHT_KEYS = new Set(["fontWeight"]);

export interface StyleDigest {
  readonly colors: readonly string[];
  readonly radii: readonly string[];
  readonly spacing: readonly string[];
  readonly fontSizes: readonly string[];
  readonly fontWeights: readonly string[];
  readonly sectionNames: readonly string[];
  /** True when the document has no authored styles to learn from. */
  readonly isEmpty: boolean;
}

function rank(counts: Map<string, number>): string[] {
  return Array.from(counts.entries())
    // Frequency first: the value used twelve times is the design, the one
    // used once is probably a mistake worth not propagating. Ties break
    // alphabetically so the digest is stable across runs — an unstable
    // prompt would silently break prompt caching.
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_VALUES_PER_CATEGORY)
    .map(([value]) => value);
}

function bump(counts: Map<string, number>, value: unknown): void {
  if (typeof value !== "string" && typeof value !== "number") {
    return;
  }
  const text = String(value).trim();
  if (text === "") {
    return;
  }
  counts.set(text, (counts.get(text) ?? 0) + 1);
}

export function buildStyleDigest(document: BuilderDocument): StyleDigest {
  const colors = new Map<string, number>();
  const radii = new Map<string, number>();
  const spacing = new Map<string, number>();
  const fontSizes = new Map<string, number>();
  const fontWeights = new Map<string, number>();
  const sectionNames: string[] = [];

  function visit(node: BuilderNode): void {
    if (node.type === "Section" && node.name) {
      sectionNames.push(node.name);
    }

    // Every breakpoint counts: a radius authored only at `lg` is still part
    // of the design language the next section should match.
    for (const declaration of Object.values(node.styles ?? {})) {
      if (typeof declaration !== "object" || declaration === null) {
        continue;
      }
      for (const [key, value] of Object.entries(declaration as Record<string, unknown>)) {
        if (COLOR_KEYS.has(key)) bump(colors, value);
        else if (RADIUS_KEYS.has(key)) bump(radii, value);
        else if (SPACING_KEYS.has(key)) bump(spacing, value);
        else if (FONT_SIZE_KEYS.has(key)) bump(fontSizes, value);
        else if (FONT_WEIGHT_KEYS.has(key)) bump(fontWeights, value);
      }
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  for (const page of document.pages ?? []) {
    visit(page.root);
  }

  const isEmpty =
    colors.size === 0 && radii.size === 0 && spacing.size === 0 && fontSizes.size === 0;

  return {
    colors: rank(colors),
    radii: rank(radii),
    spacing: rank(spacing),
    fontSizes: rank(fontSizes),
    fontWeights: rank(fontWeights),
    sectionNames: sectionNames.slice(0, 12),
    isEmpty,
  };
}

/**
 * Renders the digest for the system prompt. Returns null on an empty
 * document so the caller can omit the section entirely rather than print a
 * hollow heading the model has to reason about.
 */
export function formatStyleDigest(digest: StyleDigest): string | null {
  if (digest.isEmpty) {
    return null;
  }

  const lines: string[] = [];
  const push = (label: string, values: readonly string[]) => {
    if (values.length > 0) {
      lines.push(`- ${label}: ${values.join(", ")}`);
    }
  };

  push("Colors already in use", digest.colors);
  push("Border radii", digest.radii);
  push("Spacing values", digest.spacing);
  push("Font sizes", digest.fontSizes);
  push("Font weights", digest.fontWeights);
  push("Existing sections", digest.sectionNames);

  return lines.join("\n");
}
