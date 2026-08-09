/**
 * Document Model validation (docs/03-document-model.md).
 *
 * Split in two: structural validation (unique ids, well-formed tree)
 * which the document model can check on its own, and registry
 * validation (unknown component types, parent/child constraints) which
 * needs a ComponentRegistry and so lives separately from the pure
 * document model.
 */

import type { BuilderNode, BuilderProject, ValidationError, ValidationResult } from "./types";
import type { ComponentRegistry } from "../registry/types";
import { validateResources } from "../resources/validate";

function collectNodeIds(
  node: BuilderNode,
  path: string,
  seen: Map<string, string>,
  errors: ValidationError[],
): void {
  if (!node.id) {
    errors.push({ path, message: "Node is missing an id." });
  } else {
    const existingPath = seen.get(node.id);
    if (existingPath) {
      errors.push({ path, message: `Duplicate node id "${node.id}" (first seen at ${existingPath}).` });
    } else {
      seen.set(node.id, path);
    }
  }
  if (!node.type) {
    errors.push({ path, message: "Node is missing a type." });
  }
  node.children.forEach((child, i) => collectNodeIds(child, `${path}.children[${i}]`, seen, errors));
}

/** Checks the document is well-formed: unique page/node ids, required fields present. */
export function validateDocumentStructure(project: BuilderProject): ValidationResult {
  const errors: ValidationError[] = [];

  if (!project.pages || project.pages.length === 0) {
    errors.push({ path: "pages", message: "A project must contain at least one page." });
  }

  const seenPageIds = new Map<string, string>();
  const seenPagePaths = new Map<string, string>();
  const seenNodeIds = new Map<string, string>();

  (project.pages ?? []).forEach((page, i) => {
    const path = `pages[${i}]`;
    if (!page.id) {
      errors.push({ path, message: "Page is missing an id." });
    } else {
      const existing = seenPageIds.get(page.id);
      if (existing) {
        errors.push({ path, message: `Duplicate page id "${page.id}" (first seen at ${existing}).` });
      } else {
        seenPageIds.set(page.id, path);
      }
    }
    const normalizedPath = page.path?.trim() ? page.path.trim() : "/";
    const pathKey = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
    const existingPath = seenPagePaths.get(pathKey);
    if (existingPath) {
      errors.push({
        path: `${path}.path`,
        message: `Duplicate page path "${pathKey}" (first seen at ${existingPath}).`,
      });
    } else {
      seenPagePaths.set(pathKey, `${path}.path`);
    }
    if (!page.root) {
      errors.push({ path: `${path}.root`, message: "Page is missing a root node." });
      return;
    }
    collectNodeIds(page.root, `${path}.root`, seenNodeIds, errors);
  });

  return { valid: errors.length === 0, errors };
}

/** Validates project-level resource definitions. */
export function validateDocumentResources(project: BuilderProject): ValidationResult {
  return validateResources(project.resources);
}

/** Checks every node references a registered component type and respects its parent/child constraints. */
export function validateAgainstRegistry(project: BuilderProject, registry: ComponentRegistry): ValidationResult {
  const errors: ValidationError[] = [];

  function checkNode(node: BuilderNode, path: string, parent: BuilderNode | null): void {
    const definition = registry.get(node.type);
    if (!definition) {
      errors.push({ path, message: `Unknown component type "${node.type}".` });
    } else {
      const { allowedParents, allowedChildren, rootOnly } = definition.constraints;
      if (rootOnly && parent !== null) {
        errors.push({
          path,
          message: `Component "${node.type}" may only be used as a page root, not nested under "${parent.type}".`,
        });
      }
      if (allowedParents && !(parent && allowedParents.includes(parent.type))) {
        errors.push({
          path,
          message: `Component "${node.type}" is not allowed under parent "${parent?.type ?? "<page root>"}".`,
        });
      }
      if (allowedChildren) {
        node.children.forEach((child, i) => {
          if (!allowedChildren.includes(child.type)) {
            errors.push({
              path: `${path}.children[${i}]`,
              message: `Component "${child.type}" is not an allowed child of "${node.type}".`,
            });
          }
        });
      }
    }
    node.children.forEach((child, i) => checkNode(child, `${path}.children[${i}]`, node));
  }

  project.pages.forEach((page, i) => checkNode(page.root, `pages[${i}].root`, null));

  return { valid: errors.length === 0, errors };
}
