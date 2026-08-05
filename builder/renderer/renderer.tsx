/**
 * Renderer implementation (docs/04, ADR-002). Reads a document tree and
 * produces React output only — never writes back to the document.
 */

import { Fragment, type ReactElement } from "react";
import type { BuilderDocument, BuilderNode, BuilderPage } from "../document/types";
import type { RenderContext, Renderer } from "./types";

function renderNode(node: BuilderNode, context: RenderContext): ReactElement {
  const definition = context.registry.get(node.type);
  if (!definition) {
    throw new Error(`Unknown component type "${node.type}". Register it before rendering.`);
  }
  const Component = definition.renderer;
  const children = node.children.map((child) => renderNode(child, context));
  return (
    <Component key={node.id} id={node.id} props={node.props}>
      {children}
    </Component>
  );
}

export function createRenderer(): Renderer {
  return {
    renderPage(page: BuilderPage, context: RenderContext): ReactElement {
      return renderNode(page.root, context);
    },
    renderDocument(document: BuilderDocument, context: RenderContext): ReactElement {
      return (
        <Fragment>
          {document.pages.map((page) => (
            <Fragment key={page.id}>{renderNode(page.root, context)}</Fragment>
          ))}
        </Fragment>
      );
    },
  };
}
