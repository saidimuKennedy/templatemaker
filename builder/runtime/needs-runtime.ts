import type { BuilderNode, BuilderPage } from "../document/types";
import { containsBinding } from "../bindings/types";
import type { ComponentRegistry } from "../registry/types";

function nodeNeedsRuntime(
  node: BuilderNode,
  registry: ComponentRegistry,
): boolean {
  if (node.events && Object.keys(node.events).length > 0) {
    return true;
  }
  if (containsBinding(node.props)) {
    return true;
  }
  if (node.type === "Form") {
    return true;
  }
  const definition = registry.get(node.type);
  if (definition?.runtime === "client") {
    return true;
  }
  return node.children.some((child) => nodeNeedsRuntime(child, registry));
}

/** True when the page tree requires the client runtime bundle. */
export function pageNeedsRuntime(
  page: BuilderPage,
  registry: ComponentRegistry,
): boolean {
  return nodeNeedsRuntime(page.root, registry);
}

/** True when a document contains any page that needs the client runtime. */
export function documentNeedsRuntime(
  pages: readonly BuilderPage[],
  registry: ComponentRegistry,
): boolean {
  return pages.some((page) => pageNeedsRuntime(page, registry));
}
