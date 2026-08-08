/**
 * Builds AI prompts from the live ComponentRegistry (ADR-005, ADR-006).
 */

import { serializeDocument } from "../document/serialize";
import type { BuilderDocument } from "../document/types";
import type { ComponentRegistry } from "../registry/types";

export interface AIPromptMessages {
  readonly system: string;
  readonly user: string;
}

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

export function buildAIPrompt(
  registry: ComponentRegistry,
  document: BuilderDocument,
  userPrompt: string,
): AIPromptMessages {
  const componentLines = registry.list().map((definition) => {
    const props = formatPropertySchema(definition.propertySchema);
    const constraints = formatConstraints(definition.constraints);
    return `- ${definition.type} [${definition.category}] props={${props}} constraints={${constraints}} defaults=${JSON.stringify(definition.defaultProps)}`;
  });

  const system = [
    "You are a portfolio page builder assistant.",
    "You modify pages by emitting structured operations — never HTML, JSX, or prose.",
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
    "",
    "Registered components:",
    ...componentLines,
  ].join("\n");

  const user = [
    "Current document (JSON):",
    serializeDocument(document),
    "",
    "User request:",
    userPrompt.trim(),
  ].join("\n");

  return { system, user };
}
