/**
 * The curated, fixed vocabulary of style fields the Design panel edits
 * (docs/plans/11-style-editing-ui.md). Applies uniformly to every node
 * type — there is no per-component style schema.
 *
 * Organised into groups mirroring how CSS actually composes (Layout,
 * Size, Spacing, Position, Typography, Backgrounds, Borders, Effects),
 * because a flat list of properties gives no clue which ones interact.
 *
 * Spacing is deliberately LONGHAND only (paddingTop, marginLeft, …)
 * rather than the `padding`/`margin` shorthands. A declaration is a flat
 * property bag serialised in insertion order, so a shorthand written
 * after a longhand silently wipes it — mixing the two makes the box
 * editor unpredictable. See expandSpacingShorthand for how documents
 * authored against the older shorthand fields are migrated on edit.
 */

export type StyleFieldKind =
  | "color"
  | "spacing"
  | "typography-size"
  | "typography-weight"
  | "text-align"
  | "dimension"
  /** Fixed keyword set; requires `options`. */
  | "select"
  /** Unitless numeric (opacity, z-index, flex-grow). */
  | "number"
  /** Free-form CSS value: transforms, shadows, filters, transitions. */
  | "text";

export interface StyleField {
  readonly key: string;
  readonly label: string;
  readonly kind: StyleFieldKind;
  /** Required for kind: "select". */
  readonly options?: readonly { label: string; value: string }[];
  /** Shown under the control; used where the accepted syntax isn't obvious. */
  readonly hint?: string;
}

export interface StyleGroup {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly StyleField[];
  /** Groups past the first few start collapsed to keep the panel scannable. */
  readonly defaultOpen: boolean;
}

export const TEXT_ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
] as const;

const DISPLAY_OPTIONS = [
  { label: "Block", value: "block" },
  { label: "Flex", value: "flex" },
  { label: "Grid", value: "grid" },
  { label: "Inline block", value: "inline-block" },
  { label: "None", value: "none" },
] as const;

const FLEX_WRAP_OPTIONS = [
  { label: "Wrap", value: "wrap" },
  { label: "No wrap", value: "nowrap" },
  { label: "Wrap reverse", value: "wrap-reverse" },
] as const;

const FLEX_DIRECTION_OPTIONS = [
  { label: "Row", value: "row" },
  { label: "Column", value: "column" },
  { label: "Row reverse", value: "row-reverse" },
  { label: "Column reverse", value: "column-reverse" },
] as const;

const JUSTIFY_OPTIONS = [
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
  { label: "Space between", value: "space-between" },
  { label: "Space around", value: "space-around" },
] as const;

const ALIGN_OPTIONS = [
  { label: "Stretch", value: "stretch" },
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
  { label: "Baseline", value: "baseline" },
] as const;

const POSITION_OPTIONS = [
  { label: "Static", value: "static" },
  { label: "Relative", value: "relative" },
  { label: "Absolute", value: "absolute" },
  { label: "Fixed", value: "fixed" },
  { label: "Sticky", value: "sticky" },
] as const;

const OVERFLOW_OPTIONS = [
  { label: "Visible", value: "visible" },
  { label: "Hidden", value: "hidden" },
  { label: "Scroll", value: "scroll" },
  { label: "Auto", value: "auto" },
] as const;

const BORDER_STYLE_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
] as const;

const TEXT_TRANSFORM_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Uppercase", value: "uppercase" },
  { label: "Lowercase", value: "lowercase" },
  { label: "Capitalize", value: "capitalize" },
] as const;

const TEXT_DECORATION_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Underline", value: "underline" },
  { label: "Line through", value: "line-through" },
] as const;

const BACKGROUND_SIZE_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
] as const;

const BACKGROUND_REPEAT_OPTIONS = [
  { label: "No repeat", value: "no-repeat" },
  { label: "Repeat", value: "repeat" },
  { label: "Repeat X", value: "repeat-x" },
  { label: "Repeat Y", value: "repeat-y" },
] as const;

const CURSOR_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Default", value: "default" },
  { label: "Pointer", value: "pointer" },
  { label: "Text", value: "text" },
  { label: "Move", value: "move" },
  { label: "Not allowed", value: "not-allowed" },
] as const;

const POINTER_EVENTS_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "None", value: "none" },
] as const;

/** The four sides, in CSS shorthand order — drives the box editor. */
export const PADDING_SIDES = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
] as const;

export const MARGIN_SIDES = [
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
] as const;

export const STYLE_GROUPS: readonly StyleGroup[] = [
  {
    id: "layout",
    label: "Layout",
    defaultOpen: true,
    fields: [
      { key: "display", label: "Display", kind: "select", options: DISPLAY_OPTIONS },
      { key: "flexDirection", label: "Direction", kind: "select", options: FLEX_DIRECTION_OPTIONS },
      { key: "justifyContent", label: "Justify", kind: "select", options: JUSTIFY_OPTIONS },
      { key: "alignItems", label: "Align", kind: "select", options: ALIGN_OPTIONS },
      { key: "flexWrap", label: "Wrap", kind: "select", options: FLEX_WRAP_OPTIONS },
      { key: "gap", label: "Gap", kind: "spacing" },
      {
        key: "gridTemplateColumns",
        label: "Grid columns",
        kind: "text",
        hint: "e.g. 1fr 2fr, or repeat(auto-fit, minmax(240px, 1fr))",
      },
    ],
  },
  {
    id: "spacing",
    label: "Spacing",
    defaultOpen: true,
    fields: [
      { key: "marginTop", label: "Margin top", kind: "spacing" },
      { key: "marginRight", label: "Margin right", kind: "spacing" },
      { key: "marginBottom", label: "Margin bottom", kind: "spacing" },
      { key: "marginLeft", label: "Margin left", kind: "spacing" },
      { key: "paddingTop", label: "Padding top", kind: "spacing" },
      { key: "paddingRight", label: "Padding right", kind: "spacing" },
      { key: "paddingBottom", label: "Padding bottom", kind: "spacing" },
      { key: "paddingLeft", label: "Padding left", kind: "spacing" },
    ],
  },
  {
    id: "size",
    label: "Size",
    defaultOpen: true,
    fields: [
      { key: "width", label: "Width", kind: "dimension" },
      { key: "height", label: "Height", kind: "dimension" },
      { key: "minWidth", label: "Min width", kind: "dimension" },
      { key: "minHeight", label: "Min height", kind: "dimension" },
      { key: "maxWidth", label: "Max width", kind: "dimension" },
      { key: "maxHeight", label: "Max height", kind: "dimension" },
      { key: "overflow", label: "Overflow", kind: "select", options: OVERFLOW_OPTIONS },
    ],
  },
  {
    id: "position",
    label: "Position",
    defaultOpen: false,
    fields: [
      { key: "position", label: "Position", kind: "select", options: POSITION_OPTIONS },
      { key: "top", label: "Top", kind: "dimension" },
      { key: "right", label: "Right", kind: "dimension" },
      { key: "bottom", label: "Bottom", kind: "dimension" },
      { key: "left", label: "Left", kind: "dimension" },
      { key: "zIndex", label: "Z-index", kind: "number" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    defaultOpen: true,
    fields: [
      { key: "fontFamily", label: "Font", kind: "text", hint: "e.g. Inter, system-ui, sans-serif" },
      { key: "fontSize", label: "Font size", kind: "typography-size" },
      { key: "fontWeight", label: "Font weight", kind: "typography-weight" },
      { key: "lineHeight", label: "Line height", kind: "dimension" },
      { key: "letterSpacing", label: "Letter spacing", kind: "dimension" },
      { key: "color", label: "Text color", kind: "color" },
      { key: "textAlign", label: "Text align", kind: "text-align" },
      { key: "textTransform", label: "Transform", kind: "select", options: TEXT_TRANSFORM_OPTIONS },
      { key: "textDecoration", label: "Decoration", kind: "select", options: TEXT_DECORATION_OPTIONS },
    ],
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    defaultOpen: false,
    fields: [
      { key: "backgroundColor", label: "Background", kind: "color" },
      {
        key: "backgroundImage",
        label: "Image / gradient",
        kind: "text",
        hint: "url(…) or linear-gradient(…)",
      },
      { key: "backgroundSize", label: "Size", kind: "select", options: BACKGROUND_SIZE_OPTIONS },
      { key: "backgroundPosition", label: "Position", kind: "text", hint: "e.g. center, 50% 50%" },
      { key: "backgroundRepeat", label: "Repeat", kind: "select", options: BACKGROUND_REPEAT_OPTIONS },
    ],
  },
  {
    id: "borders",
    label: "Borders",
    defaultOpen: false,
    fields: [
      { key: "borderStyle", label: "Style", kind: "select", options: BORDER_STYLE_OPTIONS },
      { key: "borderWidth", label: "Width", kind: "dimension" },
      { key: "borderColor", label: "Color", kind: "color" },
      { key: "borderRadius", label: "Radius", kind: "dimension" },
    ],
  },
  {
    id: "effects",
    label: "Effects",
    defaultOpen: false,
    fields: [
      {
        key: "transform",
        label: "Transform",
        kind: "text",
        hint: "2D/3D — e.g. translateY(-4px) rotate(2deg) scale(1.05)",
      },
      { key: "opacity", label: "Opacity", kind: "number", hint: "0 to 1" },
      { key: "boxShadow", label: "Box shadow", kind: "text", hint: "e.g. 0 4px 12px rgba(0,0,0,.15)" },
      { key: "outline", label: "Outline", kind: "text", hint: "e.g. 2px solid #2563eb" },
      { key: "outlineOffset", label: "Outline offset", kind: "dimension" },
      { key: "filter", label: "Filter", kind: "text", hint: "e.g. blur(4px) saturate(1.2)" },
      { key: "backdropFilter", label: "Backdrop filter", kind: "text", hint: "e.g. blur(12px)" },
      { key: "transition", label: "Transition", kind: "text", hint: "e.g. all 200ms ease" },
      { key: "cursor", label: "Cursor", kind: "select", options: CURSOR_OPTIONS },
      { key: "pointerEvents", label: "Pointer events", kind: "select", options: POINTER_EVENTS_OPTIONS },
    ],
  },
];

/** Flattened view of every editable field, for lookups by key. */
export const STYLE_FIELDS: readonly StyleField[] = STYLE_GROUPS.flatMap(
  (group) => group.fields,
);

/**
 * Rewrites any legacy `padding`/`margin` shorthand in a declaration into
 * its four longhand sides, so the box editor's per-side fields become the
 * single source of truth for that node.
 *
 * Documents authored before the Design panel went longhand-only still
 * carry the shorthand; leaving it in place would let it override
 * per-side edits depending on key order. Values are copied verbatim —
 * only single-value shorthands ("16px") are expanded, since multi-value
 * forms ("8px 16px") can't be split without parsing, and those are left
 * untouched rather than silently mangled.
 */
export function expandSpacingShorthand(
  declaration: Record<string, string | number>,
): Record<string, string | number> {
  const next = { ...declaration };

  for (const [shorthand, sides] of [
    ["padding", PADDING_SIDES],
    ["margin", MARGIN_SIDES],
  ] as const) {
    const value = next[shorthand];
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string" && value.trim().includes(" ")) {
      continue;
    }
    delete next[shorthand];
    for (const side of sides) {
      if (next[side] === undefined) {
        next[side] = value;
      }
    }
  }

  return next;
}
