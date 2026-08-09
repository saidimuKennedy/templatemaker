import type { BuilderNode, BuilderPage, NodeProps } from "../document/types";
import { normalizePagePath } from "./normalize-path";

const LINK_TYPES = new Set(["Link", "LinkBlock"]);

/**
 * Joins the mount point to a document-relative page path.
 *
 * Page paths are relative to the document (`/`, `/work`), but a published
 * portfolio is served from `/p/<slug>` and an embed from `/embed/<slug>`.
 * Emitting the bare path sends `/work` to the site root, which 404s — the
 * link looks right in the editor and is broken everywhere else.
 */
export function joinBasePath(basePath: string | undefined, pagePath: string): string {
  const normalizedPage = normalizePagePath(pagePath);
  const base = (basePath ?? "").replace(/\/+$/, "");

  if (base === "") {
    return normalizedPage;
  }
  // The index page is the mount point itself; `/p/slug/` would be a second
  // URL for the same content.
  if (normalizedPage === "/") {
    return base;
  }
  return `${base}${normalizedPage}`;
}

/**
 * Resolve linkType:"page" + pageId into href before the component renders.
 * Dangling references omit href — never guess a path.
 */
export function mergePageLinksIntoProps(
  node: BuilderNode,
  props: NodeProps,
  pages: readonly BuilderPage[],
  basePath?: string,
): NodeProps {
  if (!LINK_TYPES.has(node.type)) {
    return props;
  }

  if (props.linkType !== "page") {
    return props;
  }

  const pageId = props.pageId;
  if (typeof pageId !== "string" || pageId.length === 0) {
    const { href: _href, ...rest } = props;
    return rest;
  }

  const target = pages.find((page) => page.id === pageId);
  if (!target) {
    const { href: _href, ...rest } = props;
    return rest;
  }

  return { ...props, href: joinBasePath(basePath, target.path) };
}

export function isBrokenPageLink(node: BuilderNode, pages: readonly BuilderPage[]): boolean {
  if (!LINK_TYPES.has(node.type) || node.props.linkType !== "page") {
    return false;
  }
  const pageId = node.props.pageId;
  if (typeof pageId !== "string" || pageId.length === 0) {
    return true;
  }
  return !pages.some((page) => page.id === pageId);
}
