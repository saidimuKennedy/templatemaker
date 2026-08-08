/**
 * Builds AI prompts from the live ComponentRegistry (ADR-005, ADR-006).
 */

import { serializeDocument } from "../document/serialize";
import type { BuilderDocument } from "../document/types";
import { buildStyleDigest, formatStyleDigest } from "./style-digest";
import { PLACEHOLDER_MANIFEST } from "../assets/placeholders";
import type { ComponentRegistry } from "../registry/types";
import { STYLE_GROUPS } from "../styles/fields";
import { defaultTokens } from "../styles/tokens";

export interface AIPromptMessages {
  readonly system: string;
  readonly user: string;
}

/** Hand-written composition recipes — kept in one place so they cannot drift silently. */
export const DESIGN_RECIPES = [
  `Overlay banner (Image cannot have children — overlay is a sibling Container):
Container base { position: relative, overflow: hidden, borderRadius: 24px }
├─ Image base { width: 100%, height: 100%, objectFit: cover } props.src from placeholders
└─ Container base { position: absolute, top: 0, right: 0, bottom: 0, left: 0, backgroundImage: linear-gradient(...), display: flex, alignItems: flex-end, padding: lg }
   └─ Heading / Text / Icon`,
  `Card surface:
Container base { borderRadius: 16px, padding: lg, backgroundColor: from palette tint }`,
  `Icon in circle:
Container base { borderRadius: 9999px, width: 48px, height: 48px, display: flex, justifyContent: center, alignItems: center, backgroundColor: tinted }
└─ Icon props.name from icon enum; size/color via fontSize and color styles`,
  `Divider rule:
Container base { height: 1px, backgroundColor: muted border tone, width: 100% }`,
  `Badge pill:
Container base { display: inline-block, borderRadius: 9999px, paddingTop: xs, paddingBottom: xs, paddingLeft: sm, paddingRight: sm, backgroundColor: muted }
└─ Text base { fontSize: caption scale }`,
  `Two-column split:
Grid props.columns=2 with gap from spacing scale; stack content in each cell with Stack or Container`,
].join("\n\n");

function formatConstraints(constraints: {
  readonly allowedParents?: readonly string[];
  readonly allowedChildren?: readonly string[];
  readonly rootOnly?: boolean;
}): string {
  const parts: string[] = [];
  if (constraints.rootOnly) {
    parts.push("rootOnly: may only be a page root, never nested");
  }
  if (constraints.allowedParents) {
    parts.push(`allowedParents: ${constraints.allowedParents.join(", ")}`);
  }
  if (constraints.allowedChildren) {
    parts.push(`allowedChildren: ${constraints.allowedChildren.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("; ") : "no placement constraints";
}

function formatPropertySchema(
  schema: readonly { readonly key: string; readonly type: string; readonly options?: readonly { label: string; value: string }[] }[],
): string {
  return schema
    .map((field) => {
      const options =
        field.options && field.options.length > 0
          ? ` (options: ${field.options.map((option) => option.value).join("|")})`
          : "";
      return `${field.key}:${field.type}${options}`;
    })
    .join(", ");
}

function formatStyleVocabulary(): string {
  return STYLE_GROUPS.map((group) => {
    const fields = group.fields
      .map((field) => {
        const hint = field.hint ? ` — ${field.hint}` : "";
        return `${field.key} (${field.kind})${hint}`;
      })
      .join(", ");
    return `- ${group.label}: ${fields}`;
  }).join("\n");
}

function formatTokenPalette(): string {
  const { colors, spacing, typography } = defaultTokens;
  const colorLines = Object.entries(colors)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join("\n");
  const spacingLines = Object.entries(spacing)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join("\n");
  const typeLines = Object.entries(typography)
    .map(([key, value]) => `  ${key}: ${value.fontSize}${value.fontWeight ? ` / ${value.fontWeight}` : ""}`)
    .join("\n");
  return [
    "Colors:",
    colorLines,
    "Spacing:",
    spacingLines,
    "Typography (fontSize / weight):",
    typeLines,
  ].join("\n");
}

function formatPlaceholderImages(): string {
  return PLACEHOLDER_MANIFEST.map(
    (entry) => `- ${entry.key}: ${entry.path} (${entry.aspectRatio}) — ${entry.description}`,
  ).join("\n");
}

export function buildAIPrompt(
  registry: ComponentRegistry,
  document: BuilderDocument,
  userPrompt: string,
): AIPromptMessages {
  const styleDigest = formatStyleDigest(buildStyleDigest(document));

  const componentLines = registry.list().map((definition) => {
    const props = formatPropertySchema(definition.propertySchema);
    const constraints = formatConstraints(definition.constraints);
    return `- ${definition.type} [${definition.category}] props={${props}} constraints={${constraints}} defaults=${JSON.stringify(definition.defaultProps)}`;
  });

  const system = [
    "You are a portfolio page builder assistant.",
    "You modify pages by emitting structured operations — never HTML, JSX, or prose.",
    "",
    "Task: produce ONE section that fits the existing page. Do not rebuild the whole page.",
    "",
    "Output JSON with an operations array. Each operation is one of:",
    '- create: { op:"create", id, pageId, parentId, componentType, props?, styles?, name? }',
    '- updateProps: { op:"updateProps", pageId, nodeId, props }',
    '- updateStyles: { op:"updateStyles", pageId, nodeId, styles }',
    '- move: { op:"move", pageId, nodeId, newParentId, newIndex }',
    '- delete: { op:"delete", pageId, nodeId }',
    '- rename: { op:"rename", pageId, nodeId, name? }',
    "",
    "Rules:",
    "- Use only component types listed below.",
    "- Generate unique id strings for new nodes (short random strings).",
    "- parentId must reference an existing node id from the document or an earlier create in the same batch.",
    "- Create parents before children.",
    "- Use only prop keys defined in each component's propertySchema.",
    "- Page root nodes have type Page; layout/content goes inside the page root tree.",
    "- Image has allowedChildren: [] — never nest content inside Image; use a relative Container with Image + overlay Container siblings.",
    "",
    "Styles:",
    "- styles must be breakpoint-keyed: { base: { … }, sm?: { … }, md?: { … }, lg?: { … } }.",
    "- Example: styles: { base: { backgroundColor: \"#f1f5f9\", paddingTop: \"24px\", borderRadius: \"16px\" } }",
    "- Use only style keys from the vocabulary below.",
    "- Colour values must come from the palette below, or be a tint/shade derived from one of them. Do not invent unrelated hex values.",
    "- Keep typography to a handful of scale steps from the palette.",
    "",
    "Matching the existing design:",
    "- Reuse the exact values listed under \"Design already in use\" when one fits.",
    "- Never emit a near-miss of a listed value. #f8fafc beside #f9fafb reads as a bug; pick the listed value or a clearly different one.",
    "- Layout components (Stack, Grid) carry layout in styles, not props. Set display, flexDirection, gridTemplateColumns, gap, etc. in styles.base.",
    "- Stack defaults to a column flex layout; Grid defaults to display:grid with two columns. Override explicitly when you need a row or a different track count.",
    "",
    "Style vocabulary (by group):",
    formatStyleVocabulary(),
    "",
    "Design token palette:",
    formatTokenPalette(),
    "",
    // Omitted entirely on an empty document: a hollow heading is one more
    // thing for the model to reason about and it earns nothing.
    ...(styleDigest
      ? ["Design already in use (match these):", styleDigest, ""]
      : []),
    "Placeholder images (use props.src paths exactly):",
    formatPlaceholderImages(),
    "",
    "Composition recipes:",
    DESIGN_RECIPES,
    "",
    "Registered components:",
    ...componentLines,
  ].join("\n");

  const user = [
    "Current document (JSON):",
    serializeDocument(document),
    "",
    "User request (one section):",
    userPrompt.trim(),
  ].join("\n");

  return { system, user };
}
