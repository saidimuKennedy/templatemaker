/**
 * Renderer contract (docs/04-engine-specification.md, ADR-002).
 *
 * A Renderer is a pure, read-only function of a document to output. It
 * never mutates the document and never issues commands.
 */

import type { ReactElement } from "react";
import type { BuilderDocument, BuilderPage } from "../document/types";
import type { ComponentRegistry } from "../registry/types";

/** Where the rendered output is intended to be shown/consumed. */
export type RenderTarget =
  | "editor-preview"
  | "published-webview"
  | "embedded-crm";

export interface RenderContext {
  readonly registry: ComponentRegistry;
  readonly target: RenderTarget;
  /** All pages in the document — needed to resolve page-type links. */
  readonly pages: readonly BuilderPage[];
  /**
   * Where this document is mounted in the URL space, e.g. `/p/my-slug` or
   * `/embed/my-slug`. Page paths are document-relative (`/`, `/work`), so
   * without this a resolved link points at the site root: a page link on
   * `/p/my-slug` would navigate to `/work`, which is not the portfolio and
   * does not exist.
   *
   * Omit (or pass "") when output is not mounted under a prefix — the
   * editor canvas, where links are not navigated anyway.
   */
  readonly basePath?: string;
}

/**
 * Renders a single page's node tree to React output. Implementations
 * must not read or write anything outside `page` and `context`.
 */
export interface Renderer {
  renderPage(page: BuilderPage, context: RenderContext): ReactElement;
  renderDocument(document: BuilderDocument, context: RenderContext): ReactElement;
}
