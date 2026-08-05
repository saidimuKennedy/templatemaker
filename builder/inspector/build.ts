import type { BuilderNode } from "../document/types";
import type { ComponentRegistry } from "../registry/types";
import type { InspectorField, InspectorModel } from "./types";

function resolveFieldValue(
  node: BuilderNode,
  field: { readonly key: string; readonly defaultValue?: unknown },
): unknown {
  if (Object.hasOwn(node.props, field.key)) {
    return node.props[field.key];
  }
  return field.defaultValue;
}

export function buildInspectorModel(
  node: BuilderNode,
  registry: ComponentRegistry,
): InspectorModel | undefined {
  const definition = registry.get(node.type);
  if (!definition) {
    return undefined;
  }

  const fields: InspectorField[] = definition.propertySchema.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    value: resolveFieldValue(node, field),
    ...(field.options !== undefined ? { options: field.options } : {}),
  }));

  return {
    nodeId: node.id,
    componentType: node.type,
    fields,
  };
}
