/**
 * Layout intent lives in styles, not props (ADR-010). Seeds and migrates
 * layout values from component defaults into node.styles.base.
 */

import type { BuilderDocument, BuilderNode, NodeProps, NodeStyles } from "../document/types";
import type { ComponentRegistry } from "../registry/types";
import type { NodeStyleRules } from "./types";

function stripLayoutProps(props: NodeProps, layoutKeys: readonly string[]): NodeProps {
  const next = { ...props };
  for (const key of layoutKeys) {
    delete next[key];
  }
  return next;
}

/**
 * Idempotent: copies render-time layout defaults into styles.base when
 * missing, then removes layout keys from props.
 */
export function seedLayoutStyles(node: BuilderNode, registry: ComponentRegistry): BuilderNode {
  const definition = registry.get(node.type);
  const children = node.children.map((child) => seedLayoutStyles(child, registry));

  if (!definition?.resolveStyleDefaults || !definition.layoutPropKeys?.length) {
    return children === node.children ? node : { ...node, children };
  }

  const layoutStyles = definition.resolveStyleDefaults(node.props);
  const rules = node.styles as NodeStyleRules;
  const existingBase = rules.base ?? {};
  const toSeed: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(layoutStyles)) {
    if (existingBase[key] === undefined && (typeof value === "string" || typeof value === "number")) {
      toSeed[key] = value;
    }
  }

  const nextProps = stripLayoutProps(node.props, definition.layoutPropKeys);
  const propsChanged = definition.layoutPropKeys.some((key) => key in node.props);
  const stylesChanged = Object.keys(toSeed).length > 0;

  if (!propsChanged && !stylesChanged && children === node.children) {
    return node;
  }

  const nextStyles: NodeStyleRules = stylesChanged
    ? { ...rules, base: { ...existingBase, ...toSeed } }
    : rules;

  return {
    ...node,
    props: nextProps,
    styles: nextStyles as NodeStyles,
    children,
  };
}

export function migrateDocumentLayoutIntent(
  document: BuilderDocument,
  registry: ComponentRegistry,
): BuilderDocument {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      root: seedLayoutStyles(page.root, registry),
    })),
  };
}

/** Merges layout defaults from props into normalized styles at create time. */
export function mergeLayoutDefaultsIntoStyles(
  props: NodeProps,
  styles: NodeStyleRules,
  componentType: string,
  registry: ComponentRegistry,
): NodeStyleRules {
  const definition = registry.get(componentType);
  if (!definition?.resolveStyleDefaults) {
    return styles;
  }

  const layoutStyles = definition.resolveStyleDefaults(props);
  const base = styles.base ?? {};

  const mergedBase = { ...layoutStyles, ...base };
  return { ...styles, base: mergedBase };
}
