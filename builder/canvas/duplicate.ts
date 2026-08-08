import { generateNodeId } from "../document/id";
import { findNodeAndParent } from "../document/tree";
import type { BuilderDocument, BuilderNode, NodeId, PageId } from "../document/types";
import type { Command } from "../history/types";

/**
 * Deep-clones a node, assigning a fresh id to it and every descendant.
 * Reusing ids would fail validateDocumentStructure's duplicate-id check
 * the moment the clone lands next to the original.
 */
export function cloneNodeWithNewIds(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: generateNodeId(),
    children: node.children.map(cloneNodeWithNewIds),
  };
}

/**
 * Builds the CreateNode command that duplicates `nodeId`, inserting the
 * clone immediately after the original. Returns undefined for the page
 * root (nothing to insert it "next to" as a sibling of itself) or if the
 * node can't be found.
 */
export function resolveDuplicateCommand(
  document: BuilderDocument,
  pageId: PageId,
  nodeId: NodeId,
): Command | undefined {
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return undefined;
  }
  const found = findNodeAndParent(page.root, nodeId);
  if (!found || !found.parent) {
    return undefined;
  }
  const clone = cloneNodeWithNewIds(found.node);
  return {
    type: "CreateNode",
    payload: {
      pageId,
      parentId: found.parent.id,
      index: found.index + 1,
      node: clone,
    },
  };
}
