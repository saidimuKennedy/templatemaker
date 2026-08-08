/**
 * Validates and normalizes AI-authored node styles before they reach the
 * document. Model output is untrusted — flat declarations are wrapped into
 * `base`, unknown CSS keys are dropped.
 */

import { expandSpacingShorthand, STYLE_FIELDS } from "../styles/fields";
import { defaultTokens } from "../styles/tokens";
import type { Breakpoint, NodeStyleRules } from "../styles/types";

const BREAKPOINTS: readonly Breakpoint[] = ["base", "sm", "md", "lg"];
const ALLOWED_STYLE_KEYS = new Set(STYLE_FIELDS.map((field) => field.key));

const COLOR_STYLE_KEYS = new Set(
  STYLE_FIELDS.filter((field) => field.kind === "color").map((field) => field.key),
);

const PALETTE_VALUES = new Set(
  Object.values(defaultTokens.colors).map((value) => value.toLowerCase()),
);

/**
 * Colour values that carry no palette meaning and shouldn't count as drift:
 * keywords, and the alpha overlays a scrim legitimately needs.
 */
function isPaletteAgnosticColor(value: string): boolean {
  const text = value.toLowerCase().trim();
  return (
    text === "transparent" ||
    text === "currentcolor" ||
    text === "inherit" ||
    text === "unset" ||
    text.startsWith("var(") ||
    text.startsWith("rgba(") ||
    text.startsWith("hsla(") ||
    text.startsWith("linear-gradient") ||
    text.startsWith("radial-gradient")
  );
}

export type StyleNormalizationWarningType =
  | "flat-wrapped"
  | "unknown-key"
  | "invalid-value"
  /**
   * A colour outside the token palette. Reported, never rewritten: snapping
   * a colour to its nearest token would silently change a design decision.
   * The point is to make drift measurable before deciding to enforce it.
   */
  | "off-palette-color";

export interface StyleNormalizationWarning {
  readonly type: StyleNormalizationWarningType;
  readonly message: string;
}

export interface NormalizeNodeStylesResult {
  readonly styles: NodeStyleRules;
  readonly warnings: readonly StyleNormalizationWarning[];
}

function isBreakpointKey(key: string): key is Breakpoint {
  return (BREAKPOINTS as readonly string[]).includes(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterDeclaration(
  declaration: Record<string, unknown>,
  warnings: StyleNormalizationWarning[],
): Record<string, string | number> {
  const expanded = expandSpacingShorthand(
    Object.fromEntries(
      Object.entries(declaration).filter(
        (entry): entry is [string, string | number] =>
          typeof entry[1] === "string" || typeof entry[1] === "number",
      ),
    ),
  );

  const filtered: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(expanded)) {
    if (!ALLOWED_STYLE_KEYS.has(key)) {
      warnings.push({
        type: "unknown-key",
        message: `Dropped unknown style key "${key}".`,
      });
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      if (
        COLOR_STYLE_KEYS.has(key) &&
        typeof value === "string" &&
        !isPaletteAgnosticColor(value) &&
        !PALETTE_VALUES.has(value.toLowerCase().trim())
      ) {
        warnings.push({
          type: "off-palette-color",
          message: `Off-palette colour "${value}" on "${key}".`,
        });
      }
      filtered[key] = value;
    } else {
      warnings.push({
        type: "invalid-value",
        message: `Dropped style key "${key}" with unsupported value type.`,
      });
    }
  }

  return filtered;
}

function hasBreakpointKeys(input: Record<string, unknown>): boolean {
  return Object.keys(input).some(isBreakpointKey);
}

export function normalizeNodeStyles(input: unknown): NormalizeNodeStylesResult {
  const warnings: StyleNormalizationWarning[] = [];

  if (!isPlainObject(input)) {
    return { styles: {}, warnings };
  }

  if (hasBreakpointKeys(input)) {
    const styles: NodeStyleRules = {};

    for (const [key, value] of Object.entries(input)) {
      if (isBreakpointKey(key)) {
        if (!isPlainObject(value)) {
          warnings.push({
            type: "invalid-value",
            message: `Skipped breakpoint "${key}" — expected an object of style properties.`,
          });
          continue;
        }
        const filtered = filterDeclaration(value, warnings);
        if (Object.keys(filtered).length > 0) {
          styles[key] = filtered;
        }
        continue;
      }

      if (ALLOWED_STYLE_KEYS.has(key)) {
        warnings.push({
          type: "unknown-key",
          message: `Dropped top-level style key "${key}" — styles must be keyed by breakpoint (base/sm/md/lg).`,
        });
      } else {
        warnings.push({
          type: "unknown-key",
          message: `Dropped unknown style key "${key}".`,
        });
      }
    }

    return { styles, warnings };
  }

  warnings.push({
    type: "flat-wrapped",
    message: "Wrapped flat style declaration into base breakpoint.",
  });

  const filtered = filterDeclaration(input, warnings);
  return {
    styles: Object.keys(filtered).length > 0 ? { base: filtered } : {},
    warnings,
  };
}

export function normalizeNodeStylesWithLogging(input: unknown): NodeStyleRules {
  const { styles, warnings } = normalizeNodeStyles(input);
  for (const warning of warnings) {
    console.warn(`[ai/styles] ${warning.message}`);
  }
  return styles;
}
