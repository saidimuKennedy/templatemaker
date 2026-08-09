/**
 * Parsing and serialization for the numeric style controls (Size and Position
 * panels).
 *
 * The panels show a number beside a unit dropdown, but the document stores a
 * plain CSS string, so every value makes a round trip through here. The reason
 * this is more than `parseFloat` is that the round trip must not lose
 * information: a `2rem` offset read as "2 px" is silently rewritten to `2px`
 * the moment the field is touched, and `calc(100% - 10px)` has no numeric part
 * at all. Values this module can't express as number + unit are kept verbatim
 * in `custom` mode, where the panel edits the raw text instead of guessing.
 */

export const DIMENSION_UNITS = ["px", "%", "em", "rem", "vh", "vw"] as const;

export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

/** Marks the unit dropdown's raw-text escape hatch. Not a CSS unit. */
export const CUSTOM_UNIT = "custom";

export type DimensionMode = "empty" | "keyword" | "value" | "custom";

export interface ParsedDimension {
  readonly mode: DimensionMode;
  /** Set when mode is "keyword": `auto` or `none`. */
  readonly keyword?: "auto" | "none";
  /** Set when mode is "value": the number, without its unit. */
  readonly numeric: string;
  /** Set when mode is "value"; also the unit a fresh number would take. */
  readonly unit: DimensionUnit;
  /** Set when mode is "custom": the untouched authored text. */
  readonly raw: string;
}

export interface DimensionOptions {
  readonly allowAuto?: boolean;
  readonly allowNone?: boolean;
  readonly defaultUnit?: DimensionUnit;
}

// Longest-first so `rem` wins over `em`; `%` is literal in a character
// alternation, so no escaping is needed.
const UNIT_PATTERN = [...DIMENSION_UNITS].sort((a, b) => b.length - a.length).join("|");
const NUMBER_WITH_UNIT = new RegExp(`^(-?(?:\\d+\\.?\\d*|\\.\\d+))(${UNIT_PATTERN})$`);
const BARE_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;

export function parseDimension(
  raw: string | number | undefined,
  options: DimensionOptions = {},
): ParsedDimension {
  const fallbackUnit = options.defaultUnit ?? "px";

  if (raw === undefined || raw === "") {
    return { mode: "empty", numeric: "", unit: fallbackUnit, raw: "" };
  }

  const text = String(raw).trim();
  const lower = text.toLowerCase();

  if (lower === "auto" && options.allowAuto) {
    return { mode: "keyword", keyword: "auto", numeric: "", unit: fallbackUnit, raw: text };
  }
  if (lower === "none" && options.allowNone) {
    return { mode: "keyword", keyword: "none", numeric: "", unit: fallbackUnit, raw: text };
  }

  const match = NUMBER_WITH_UNIT.exec(lower);
  if (match) {
    return {
      mode: "value",
      numeric: match[1]!,
      unit: match[2] as DimensionUnit,
      raw: text,
    };
  }

  if (BARE_NUMBER.test(lower)) {
    return { mode: "value", numeric: lower, unit: fallbackUnit, raw: text };
  }

  // calc(), var(), clamp(), a unit we don't offer, an unfinished keyword —
  // anything we can't take apart is edited as text rather than reinterpreted.
  return { mode: "custom", numeric: "", unit: fallbackUnit, raw: text };
}

/** Number + unit to a CSS value. Empty input means "clear this property". */
export function serializeDimension(numeric: string, unit: DimensionUnit): string {
  const trimmed = numeric.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed}${unit}`;
}

/**
 * Whether `text` is far enough along to be worth writing to the document.
 *
 * Controlled inputs would otherwise persist every intermediate keystroke, and
 * `-` or `.` on their own serialize to `-px` / `.px` — invalid declarations
 * that reach published CSS. The panels hold these partials in local state and
 * commit only once this returns true.
 */
export function isCommittableNumber(text: string): boolean {
  const trimmed = text.trim();
  return trimmed !== "" && BARE_NUMBER.test(trimmed) && /\d/.test(trimmed);
}

/** The dropdown value representing a parsed dimension. */
export function unitSelectValue(parsed: ParsedDimension): string {
  if (parsed.mode === "keyword" && parsed.keyword) {
    return parsed.keyword;
  }
  if (parsed.mode === "custom") {
    return CUSTOM_UNIT;
  }
  return parsed.unit;
}
