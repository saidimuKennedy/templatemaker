/** Parse and serialize CSS effect values for the Effects panel editor. */

export function splitCssCommaList(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") {
      depth += 1;
    }
    if (char === ")") {
      depth -= 1;
    }
    if (char === "," && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

export function parseLength(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  const text = value.trim();
  const numeric = Number.parseFloat(text.endsWith("px") ? text.slice(0, -2) : text);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export type ParsedBoxShadow = {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  /**
   * Unit the lengths were authored in, reused when serializing. Without it a
   * shadow written as `0 0.5rem 1rem` came back as `0.5px 1px` — a sixteenth of
   * the intended size.
   */
  unit: string;
  /**
   * Undefined for a shadow authored without a colour, which is legal CSS and
   * paints in `currentColor`. Inventing one here changed the design; appending
   * the leftover `px` of the last length (the earlier behaviour) produced an
   * invalid declaration and the shadow vanished.
   */
  color?: string;
  /**
   * Set when a length is an expression the sliders can't represent
   * (`calc()`, `var()`). The panel edits it as text and serialization returns
   * it untouched rather than rounding it to 0.
   */
  raw?: string;
};

/** A CSS length: number plus optional unit. Anything else is an expression. */
const LENGTH = /^-?(?:\d+\.?\d*|\.\d+)([a-z%]*)$/i;

/** Hex, a colour function, a custom property, or a keyword like `currentColor`. */
const COLOR_TOKEN = /^(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix|var)\(.*\)|[a-z]+)$/i;

/** Splits on whitespace, but not inside `rgb(…)` / `var(…)`. */
function splitTopLevelTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") {
      depth += 1;
    }
    if (char === ")") {
      depth -= 1;
    }
    if (/\s/.test(char) && depth === 0) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

export function parseBoxShadow(value: string): ParsedBoxShadow | null {
  const original = value.trim();
  if (!original) {
    return null;
  }

  const inset = /^inset\b/i.test(original);
  const body = inset ? original.replace(/^inset\s+/i, "") : original;
  const tokens = splitTopLevelTokens(body);

  /*
   * Lengths come first in `box-shadow`, so take them from the front and treat
   * whatever remains as the colour. Matching the colour from the end instead
   * misread `0 2px 4px` — the trailing `px` looked like a colour keyword.
   */
  const lengths: string[] = [];
  let index = 0;
  while (index < tokens.length && lengths.length < 4 && LENGTH.test(tokens[index]!)) {
    lengths.push(tokens[index]!);
    index += 1;
  }
  const rest = tokens.slice(index);

  /*
   * What may follow the lengths is a single colour, and nothing else. Anything
   * more — a `var()` standing in for an offset, a length after a non-length —
   * means the sliders cannot represent this shadow, so it is kept verbatim
   * instead of being rounded to zeros.
   */
  const representable =
    lengths.length > 0 &&
    (rest.length === 0 || (rest.length === 1 && COLOR_TOKEN.test(rest[0]!)));
  if (!representable) {
    return { inset, x: 0, y: 0, blur: 0, spread: 0, unit: "px", raw: original };
  }

  const units = lengths.map((token) => LENGTH.exec(token)?.[1] ?? "").filter(Boolean);
  const numbers = lengths.map((token) => Number.parseFloat(token));

  return {
    inset,
    x: numbers[0] ?? 0,
    y: numbers[1] ?? 0,
    blur: numbers[2] ?? 0,
    spread: numbers[3] ?? 0,
    unit: units[0] ?? "px",
    ...(rest.length > 0 ? { color: rest.join(" ") } : {}),
  };
}

export function serializeBoxShadow(shadow: ParsedBoxShadow): string {
  if (shadow.raw) {
    return shadow.raw;
  }
  const prefix = shadow.inset ? "inset " : "";
  const unit = shadow.unit || "px";
  const lengths = [shadow.x, shadow.y, shadow.blur, shadow.spread]
    .map((length) => `${length}${unit}`)
    .join(" ");
  return shadow.color ? `${prefix}${lengths} ${shadow.color}` : `${prefix}${lengths}`;
}

export function parseBoxShadows(value: string): ParsedBoxShadow[] {
  if (!value.trim()) {
    return [];
  }
  return splitCssCommaList(value)
    .map(parseBoxShadow)
    .filter((shadow): shadow is ParsedBoxShadow => shadow !== null);
}

export function serializeBoxShadows(shadows: readonly ParsedBoxShadow[]): string {
  return shadows.map(serializeBoxShadow).join(", ");
}

export type TransformMove = {
  x: number;
  y: number;
  z: number;
};

export function parseTransformMove(value: string): TransformMove {
  const translate3d = /translate3d\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i.exec(value);
  if (translate3d) {
    return {
      x: parseLength(translate3d[1]),
      y: parseLength(translate3d[2]),
      z: parseLength(translate3d[3]),
    };
  }
  const translate = /translate\(\s*([^,]+),\s*([^)]+)\)/i.exec(value);
  if (translate) {
    return {
      x: parseLength(translate[1]),
      y: parseLength(translate[2]),
      z: 0,
    };
  }
  return { x: 0, y: 0, z: 0 };
}

export function upsertTransformMove(value: string, move: TransformMove): string {
  const without = value
    .replace(/translate3d\([^)]*\)/gi, "")
    .replace(/translate\([^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const allZero = move.x === 0 && move.y === 0 && move.z === 0;
  if (allZero) {
    return without;
  }
  const translate = `translate3d(${move.x}px, ${move.y}px, ${move.z}px)`;
  return without ? `${translate} ${without}`.trim() : translate;
}

export function summarizeTransformMove(value: string): string {
  const move = parseTransformMove(value);
  return `Move: ${move.x}px, ${move.y}px, ${move.z}px`;
}

export function parseBlurAmount(value: string): number | null {
  const match = /blur\(\s*([^)]+)\)/i.exec(value);
  if (!match) {
    return null;
  }
  return parseLength(match[1]);
}

export function upsertBlur(value: string, radius: number): string {
  const without = value.replace(/blur\([^)]*\)/gi, "").replace(/\s+/g, " ").trim();
  if (radius <= 0) {
    return without;
  }
  const blur = `blur(${radius}px)`;
  return without ? `${without} ${blur}`.trim() : blur;
}

export type ParsedTransition = {
  property: string;
  durationMs: number;
  easing: string;
};

export function parseTransition(value: string): ParsedTransition | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\S+)\s+(\d+(?:\.\d+)?)(m?s)\s+(\S+)$/i.exec(trimmed);
  if (!match) {
    return { property: "all", durationMs: 200, easing: "ease" };
  }
  const durationRaw = Number.parseFloat(match[2]);
  const durationMs = match[3].toLowerCase().startsWith("s") && !match[3].toLowerCase().startsWith("ms")
    ? durationRaw * 1000
    : durationRaw;
  return {
    property: match[1],
    durationMs,
    easing: match[4],
  };
}

export function serializeTransition(transition: ParsedTransition): string {
  return `${transition.property} ${transition.durationMs}ms ${transition.easing}`;
}

export type OutlineStyle = "none" | "solid" | "dashed" | "dotted";

export type ParsedOutline = {
  style: OutlineStyle;
  width: number;
  color: string;
};

export function parseOutline(value: string | undefined): ParsedOutline {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "none") {
    return { style: "none", width: 1, color: "#2563eb" };
  }
  const match = /^(\d+(?:\.\d+)?px)\s+(solid|dashed|dotted)\s+(.+)$/i.exec(trimmed);
  if (!match) {
    return { style: "solid", width: 1, color: trimmed };
  }
  return {
    style: match[2].toLowerCase() as OutlineStyle,
    width: parseLength(match[1]),
    color: match[3].trim(),
  };
}

export function serializeOutline(outline: ParsedOutline): string {
  if (outline.style === "none") {
    return "none";
  }
  return `${outline.width}px ${outline.style} ${outline.color}`;
}

export function parseOpacityPercent(value: string | number | undefined): number {
  if (value === undefined || value === "") {
    return 100;
  }
  const numeric = Number.parseFloat(String(value));
  if (Number.isNaN(numeric)) {
    return 100;
  }
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

export function serializeOpacityPercent(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped === 100) {
    return "";
  }
  return String(clamped / 100);
}

export function summarizeBoxShadow(shadow: ParsedBoxShadow): string {
  const type = shadow.inset ? "Inner shadow" : "Outer shadow";
  if (shadow.raw) {
    return `${type}: ${shadow.raw}`;
  }
  const unit = shadow.unit || "px";
  return `${type}: ${shadow.x}${unit} ${shadow.y}${unit} ${shadow.blur}${unit} ${shadow.spread}${unit}`;
}
