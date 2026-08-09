/**
 * Maps AI intermediate operations to engine Commands (ADR-006).
 */

import type { BuilderDocument, BuilderNode, NodeProps, NodeStyles } from "../document/types";
import { findNodeAndParent } from "../document/tree";
import type { Command } from "../history/types";
import type { ComponentRegistry } from "../registry/types";
import { mergeLayoutDefaultsIntoStyles, seedLayoutStyles } from "../styles/layout-intent";
import { normalizeNodeStylesWithLogging } from "./normalize-styles";
import type { AIOperation } from "./schema";

function filterProps(
  props: Record<string, unknown> | undefined,
  allowedKeys: readonly string[],
  defaults: NodeProps,
): NodeProps {
  const merged = { ...defaults, ...props };
  const filtered: NodeProps = { ...defaults };
  for (const key of allowedKeys) {
    if (key in merged) {
      filtered[key] = merged[key];
    }
  }
  return filtered;
}

function collectNodeIds(node: BuilderNode, ids: Set<string>): void {
  ids.add(node.id);
  for (const child of node.children) {
    collectNodeIds(child, ids);
  }
}

function collectDocumentNodeIds(document: BuilderDocument): Set<string> {
  const ids = new Set<string>();
  for (const page of document.pages) {
    collectNodeIds(page.root, ids);
  }
  return ids;
}

function pageExists(document: BuilderDocument, pageId: string): boolean {
  return document.pages.some((page) => page.id === pageId);
}

const LINK_COMPONENTS = new Set(["Link", "LinkBlock"]);

function looksLikeInternalHref(href: unknown): boolean {
  return typeof href === "string" && (href.startsWith("/") || href.startsWith("#"));
}

/** Count url-type links whose href looks like internal navigation — prompt drift signal. */
export function countInternalUrlLinks(props: Record<string, unknown> | undefined): number {
  if (!props || props.linkType === "page") {
    return 0;
  }
  return looksLikeInternalHref(props.href) ? 1 : 0;
}

function validateLinkProps(
  componentType: string,
  props: Record<string, unknown> | undefined,
  document: BuilderDocument,
): void {
  if (!LINK_COMPONENTS.has(componentType) || !props) {
    return;
  }

  if (props.linkType === "page") {
    const pageId = props.pageId;
    if (typeof pageId !== "string" || !pageId) {
      throw new Error(`${componentType} with linkType "page" requires a pageId.`);
    }
    if (!pageExists(document, pageId)) {
      throw new Error(`Page "${pageId}" does not exist.`);
    }
    return;
  }

  if (looksLikeInternalHref(props.href)) {
    console.warn(
      `[ai/translate] ${componentType} uses an internal-looking href (${String(props.href)}). Prefer linkType "page" with pageId.`,
    );
  }
}

function findNodeInDocument(document: BuilderDocument, nodeId: string): BuilderNode | undefined {
  for (const page of document.pages) {
    const found = findNodeAndParent(page.root, nodeId);
    if (found) {
      return found.node;
    }
  }
  return undefined;
}

function validateLinkPropsFromPatch(
  nodeId: string,
  props: Record<string, unknown>,
  document: BuilderDocument,
  registry: ComponentRegistry,
): void {
  const node = findNodeInDocument(document, nodeId);
  if (!node || !LINK_COMPONENTS.has(node.type)) {
    return;
  }
  const definition = registry.get(node.type);
  const merged = { ...definition?.defaultProps, ...node.props, ...props };
  validateLinkProps(node.type, merged, document);
}

export function translateOperations(
  operations: readonly AIOperation[],
  document: BuilderDocument,
  registry: ComponentRegistry,
): Command[] {
  const knownNodeIds = collectDocumentNodeIds(document);
  const commands: Command[] = [];

  for (const operation of operations) {
    if (!pageExists(document, operation.pageId)) {
      throw new Error(`Page "${operation.pageId}" does not exist.`);
    }

    switch (operation.op) {
      case "create": {
        const definition = registry.get(operation.componentType);
        if (!definition) {
          throw new Error(`Unknown component type "${operation.componentType}".`);
        }
        if (!knownNodeIds.has(operation.parentId)) {
          throw new Error(`Parent node "${operation.parentId}" does not exist.`);
        }
        if (knownNodeIds.has(operation.id)) {
          throw new Error(`Node id "${operation.id}" already exists.`);
        }

        const layoutKeys = new Set(definition.layoutPropKeys ?? []);
        const allowedKeys = definition.propertySchema
          .map((field) => field.key)
          .filter((key) => !layoutKeys.has(key));
        const mergedProps = { ...definition.defaultProps, ...operation.props };
        const props = filterProps(operation.props, allowedKeys, definition.defaultProps);
        validateLinkProps(operation.componentType, props, document);

        const normalized = normalizeNodeStylesWithLogging(operation.styles ?? {});
        const stylesWithLayout = mergeLayoutDefaultsIntoStyles(
          mergedProps,
          normalized,
          operation.componentType,
          registry,
        ) as NodeStyles;

        const node = seedLayoutStyles(
          {
            id: operation.id,
            type: operation.componentType,
            props,
            styles: stylesWithLayout,
            children: [],
            ...(operation.name !== undefined ? { name: operation.name } : {}),
          },
          registry,
        );

        commands.push({
          type: "CreateNode",
          payload: {
            pageId: operation.pageId,
            parentId: operation.parentId,
            node,
          },
        });
        knownNodeIds.add(operation.id);
        break;
      }
      case "updateProps": {
        if (!knownNodeIds.has(operation.nodeId)) {
          throw new Error(`Node "${operation.nodeId}" does not exist.`);
        }
        validateLinkPropsFromPatch(operation.nodeId, operation.props, document, registry);
        commands.push({
          type: "UpdateProps",
          payload: {
            pageId: operation.pageId,
            nodeId: operation.nodeId,
            props: operation.props as NodeProps,
          },
        });
        break;
      }
      case "updateStyles": {
        if (!knownNodeIds.has(operation.nodeId)) {
          throw new Error(`Node "${operation.nodeId}" does not exist.`);
        }
        commands.push({
          type: "UpdateStyles",
          payload: {
            pageId: operation.pageId,
            nodeId: operation.nodeId,
            styles: normalizeNodeStylesWithLogging(operation.styles) as NodeStyles,
          },
        });
        break;
      }
      case "move": {
        if (!knownNodeIds.has(operation.nodeId)) {
          throw new Error(`Node "${operation.nodeId}" does not exist.`);
        }
        if (!knownNodeIds.has(operation.newParentId)) {
          throw new Error(`Target parent "${operation.newParentId}" does not exist.`);
        }
        commands.push({
          type: "MoveNode",
          payload: {
            pageId: operation.pageId,
            nodeId: operation.nodeId,
            newParentId: operation.newParentId,
            newIndex: operation.newIndex,
          },
        });
        break;
      }
      case "delete": {
        if (!knownNodeIds.has(operation.nodeId)) {
          throw new Error(`Node "${operation.nodeId}" does not exist.`);
        }
        commands.push({
          type: "DeleteNode",
          payload: {
            pageId: operation.pageId,
            nodeId: operation.nodeId,
          },
        });
        knownNodeIds.delete(operation.nodeId);
        break;
      }
      case "rename": {
        if (!knownNodeIds.has(operation.nodeId)) {
          throw new Error(`Node "${operation.nodeId}" does not exist.`);
        }
        commands.push({
          type: "RenameNode",
          payload: {
            pageId: operation.pageId,
            nodeId: operation.nodeId,
            name: operation.name,
          },
        });
        break;
      }
    }
  }

  return commands;
}
