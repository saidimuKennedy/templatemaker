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
}

/**
 * Renders a single page's node tree to React output. Implementations
 * must not read or write anything outside `page` and `context`.
 */
export interface Renderer {
  renderPage(page: BuilderPage, context: RenderContext): ReactElement;
  renderDocument(document: BuilderDocument, context: RenderContext): ReactElement;
}
