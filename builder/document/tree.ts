/**
 * Immutable tree operations over a BuilderNode. These are the only way
 * the engine walks or rewrites a node tree — commands never mutate a
 * BuilderNode in place.
 */

import type { BuilderNode, NodeId } from "./types";

export interface FoundNode {
  readonly node: BuilderNode;
  /** null when `node` is the tree root passed to findNodeAndParent. */
  readonly parent: BuilderNode | null;
  /** -1 when `node` is the tree root. */
  readonly index: number;
}

export function findNodeAndParent(root: BuilderNode, id: NodeId): FoundNode | undefined {
  if (root.id === id) {
    return { node: root, parent: null, index: -1 };
  }
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.id === id) {
      return { node: child, parent: root, index: i };
    }
    const found = findNodeAndParent(child, id);
    if (found) return found;
  }
  return undefined;
}

export interface RemoveResult {
  readonly tree: BuilderNode;
  readonly removed: BuilderNode;
  readonly parentId: NodeId;
  readonly index: number;
}

/** Removes the node with `id` from anywhere in the tree. Cannot remove the root itself. */
export function removeNode(root: BuilderNode, id: NodeId): RemoveResult | undefined {
  let removedInfo: { removed: BuilderNode; parentId: NodeId; index: number } | undefined;

  function walk(node: BuilderNode): BuilderNode {
    if (removedInfo) return node;

    const index = node.children.findIndex((c) => c.id === id);
    if (index !== -1) {
      const removed = node.children[index];
      removedInfo = { removed, parentId: node.id, index };
      return {
        ...node,
        children: [...node.children.slice(0, index), ...node.children.slice(index + 1)],
      };
    }

    let changed = false;
    const children = node.children.map((child) => {
      if (removedInfo) return child;
      const updated = walk(child);
      if (updated !== child) changed = true;
      return updated;
    });

    return changed ? { ...node, children } : node;
  }

  const tree = walk(root);
  if (!removedInfo) return undefined;
  return { tree, removed: removedInfo.removed, parentId: removedInfo.parentId, index: removedInfo.index };
}

/** Inserts `node` as a child of `parentId` at `index` (append if omitted). */
export function insertNode(
  root: BuilderNode,
  parentId: NodeId,
  node: BuilderNode,
  index?: number,
): BuilderNode | undefined {
  function walk(current: BuilderNode): BuilderNode | undefined {
    if (current.id === parentId) {
      const children = current.children.slice();
      const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
      children.splice(at, 0, node);
      return { ...current, children };
    }
    for (let i = 0; i < current.children.length; i++) {
      const updated = walk(current.children[i]);
      if (updated) {
        const children = current.children.slice();
        children[i] = updated;
        return { ...current, children };
      }
    }
    return undefined;
  }
  return walk(root);
}

/** Replaces the node with `id` using `updater`, preserving its id and children unless updater changes them. */
export function updateNode(
  root: BuilderNode,
  id: NodeId,
  updater: (node: BuilderNode) => BuilderNode,
): BuilderNode | undefined {
  function walk(current: BuilderNode): BuilderNode | undefined {
    if (current.id === id) return updater(current);
    for (let i = 0; i < current.children.length; i++) {
      const updated = walk(current.children[i]);
      if (updated) {
        const children = current.children.slice();
        children[i] = updated;
        return { ...current, children };
      }
    }
    return undefined;
  }
  return walk(root);
}
