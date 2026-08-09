import { Fragment, type ReactElement } from "react";
import type { Prisma } from "@prisma/client";
import { findNodeAndParent } from "@/builder/document/tree";
import { deserializeDocument } from "@/builder/document/serialize";
import {
  validateAgainstRegistry,
  validateDocumentStructure,
} from "@/builder/document/validate";
import { validateDocumentEvents } from "@/builder/document/validate-events";
import type { BuilderDocument, BuilderNode, BuilderPage, ValidationResult } from "@/builder/document/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import type { RenderTarget } from "@/builder/renderer/types";
import { createRenderer } from "@/builder/renderer/renderer";
import { createStyledRenderer } from "@/builder/styles/apply";
import { buildResponsiveStylesheet } from "@/builder/styles/responsive";
import { pageNeedsRuntime } from "@/builder/runtime/needs-runtime";
import { CSP_NONCE_HEADER } from "@/lib/hosts";
import { BuilderRuntimeProvider } from "@/builder/runtime/BuilderRuntimeProvider";

export function parseBuilderContent(raw: Prisma.JsonValue): BuilderDocument | undefined {
  try {
    return deserializeDocument(JSON.stringify(raw));
  } catch {
    return undefined;
  }
}

export function validatePortfolioDocument(
  document: BuilderDocument,
  registry: ComponentRegistry,
): ValidationResult {
  const structure = validateDocumentStructure(document);
  const registryResult = validateAgainstRegistry(document, registry);
  const eventsResult = validateDocumentEvents(document);

  return {
    valid: structure.valid && registryResult.valid && eventsResult.valid,
    errors: [...structure.errors, ...registryResult.errors, ...eventsResult.errors],
  };
}

function walkForProfileHeader(node: BuilderNode): BuilderNode | undefined {
  if (node.type === "ProfileHeader") {
    return node;
  }
  for (const child of node.children) {
    const found = walkForProfileHeader(child);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function findProfileHeaderNode(document: BuilderDocument): BuilderNode | undefined {
  for (const page of document.pages) {
    const found = walkForProfileHeader(page.root);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function getProfileHeaderName(document: BuilderDocument): string {
  const node = findProfileHeaderNode(document);
  if (!node) {
    return "";
  }
  return typeof node.props.name === "string" ? node.props.name : "";
}

export function getProfileHeaderBio(document: BuilderDocument): string {
  const node = findProfileHeaderNode(document);
  if (!node) {
    return "";
  }
  return typeof node.props.bio === "string" ? node.props.bio : "";
}

import { normalizePagePath } from "@/builder/pages/normalize-path";

export { normalizePagePath };

/** Resolves a page from URL path segments. Root (`/`) falls back to the index page. */
export function resolvePageByPath(
  document: BuilderDocument,
  pathSegments?: readonly string[],
): BuilderPage | undefined {
  const requestPath =
    !pathSegments || pathSegments.length === 0 ? "/" : `/${pathSegments.join("/")}`;

  const exact = document.pages.find(
    (page) => normalizePagePath(page.path) === requestPath,
  );
  if (exact) {
    return exact;
  }

  if (requestPath === "/") {
    return (
      document.pages.find((page) => normalizePagePath(page.path) === "/") ??
      document.pages[0]
    );
  }

  return undefined;
}

function renderResponsivePage(
  document: BuilderDocument,
  registry: ComponentRegistry,
  target: RenderTarget,
  page: BuilderPage,
  basePath?: string,
  styleNonce?: string,
): ReactElement {
  const renderer = createStyledRenderer(createRenderer(), "base");
  const needsRuntime = pageNeedsRuntime(page, registry);
  const tree = renderer.renderPage(page, {
    registry,
    target,
    pages: document.pages,
    basePath,
    enableRuntime: needsRuntime,
  });
  const stylesheet = buildResponsiveStylesheet(document);

  const content = (
    <Fragment>
      {stylesheet ? (
        <style nonce={styleNonce} dangerouslySetInnerHTML={{ __html: stylesheet }} />
      ) : null}
      {tree}
    </Fragment>
  );

  if (!needsRuntime) {
    return content;
  }

  return <BuilderRuntimeProvider>{content}</BuilderRuntimeProvider>;
}

function renderResponsive(
  document: BuilderDocument,
  registry: ComponentRegistry,
  target: RenderTarget,
  pathSegments?: readonly string[],
  basePath?: string,
  styleNonce?: string,
): ReactElement {
  const page = resolvePageByPath(document, pathSegments);
  if (!page) {
    throw new Error("Page not found.");
  }
  return renderResponsivePage(document, registry, target, page, basePath, styleNonce);
}

/**
 * Renders a published portfolio page. On the dedicated site origin the
 * document is mounted at `/`, so `basePath` is omitted and page links
 * resolve to bare paths (`/work`). The editor preview and legacy app-origin
 * mount at `/p/<slug>` and pass that prefix explicitly.
 */
export function renderPublished(
  document: BuilderDocument,
  registry: ComponentRegistry,
  pathSegments?: readonly string[],
  basePath?: string,
  styleNonce?: string,
): ReactElement {
  return renderResponsive(
    document,
    registry,
    "published-webview",
    pathSegments,
    basePath,
    styleNonce,
  );
}

/**
 * Same responsive-stylesheet treatment as renderPublished, but with
 * target "embedded-crm" — builder/publish/embed.ts's renderEmbed uses
 * the plain (non-styled) renderer, which would make embedded pages
 * ignore sm/md/lg overrides entirely. This app-level wrapper is kept
 * here rather than changing builder/publish/embed.ts's renderer choice,
 * since that file is engine code owned by a different plan.
 */
export function renderEmbedded(
  document: BuilderDocument,
  registry: ComponentRegistry,
  pathSegments?: readonly string[],
  basePath?: string,
  styleNonce?: string,
): ReactElement {
  return renderResponsive(
    document,
    registry,
    "embedded-crm",
    pathSegments,
    basePath,
    styleNonce,
  );
}

/** Reads the CSP nonce forwarded by the site-origin proxy rewrite. */
export async function readPublishedStyleNonce(): Promise<string | undefined> {
  const { headers } = await import("next/headers");
  const headerStore = await headers();
  return headerStore.get(CSP_NONCE_HEADER) ?? undefined;
}

export function findNodeParentId(
  document: BuilderDocument,
  pageId: string,
  nodeId: string,
): string | undefined {
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return undefined;
  }
  const found = findNodeAndParent(page.root, nodeId);
  return found?.parent?.id;
}
