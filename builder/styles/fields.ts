/**
 * The curated, fixed vocabulary of style fields the Design panel edits
 * (docs/plans/11-style-editing-ui.md). Applies uniformly to every node
 * type — there is no per-component style schema.
 */

export type StyleFieldKind =
  | "color"
  | "spacing"
  | "typography-size"
  | "typography-weight"
  | "text-align"
  | "dimension";

export interface StyleField {
  readonly key: string;
  readonly label: string;
  readonly kind: StyleFieldKind;
}

export const STYLE_FIELDS: readonly StyleField[] = [
  { key: "color", label: "Text color", kind: "color" },
  { key: "backgroundColor", label: "Background", kind: "color" },
  { key: "padding", label: "Padding", kind: "spacing" },
  { key: "margin", label: "Margin", kind: "spacing" },
  { key: "fontSize", label: "Font size", kind: "typography-size" },
  { key: "fontWeight", label: "Font weight", kind: "typography-weight" },
  { key: "textAlign", label: "Text align", kind: "text-align" },
  { key: "width", label: "Width", kind: "dimension" },
  { key: "height", label: "Height", kind: "dimension" },
];

export const TEXT_ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
] as const;
