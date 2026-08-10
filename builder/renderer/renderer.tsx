/**
 * Renderer implementation (docs/04, ADR-002). Reads a document tree and
 * produces React output only — never writes back to the document.
 */

import { Fragment, type ReactElement } from "react";
import type { BuilderDocument, BuilderNode, BuilderPage } from "../document/types";
import { resolveProps, type BindingScope } from "../bindings/resolve";
import { containsBinding } from "../bindings/types";
import { mergePageLinksIntoProps } from "../pages/resolve-links";
import { shouldShowEmptyPlaceholder } from "./empty-state";
import type { RenderContext, Renderer } from "./types";
import { selectRenderer } from "./select-renderer";

function renderNode(node: BuilderNode, context: RenderContext): ReactElement {
  const definition = context.registry.get(node.type);
  if (!definition) {
    throw new Error(`Unknown component type "${node.type}". Register it before rendering.`);
  }
  const children = node.children.map((child) => renderNode(child, context));
  let resolvedProps = node.props;
  if (context.enableRuntime && containsBinding(node.props)) {
    const scope: BindingScope = context.bindingScope ?? {};
    resolvedProps = resolveProps(resolvedProps, scope);
  }
  if (context.resources && node.type === "Form") {
    resolvedProps = { ...resolvedProps, _resources: context.resources };
  }
  const { Component, props } = selectRenderer(node, definition, {
    ...mergePageLinksIntoProps(node, resolvedProps, context.pages, context.basePath),
    showEmptyPlaceholder: shouldShowEmptyPlaceholder(node, context.target),
  }, context.enableRuntime === true);

  return (
    <Component key={node.id} id={node.id} props={props}>
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
