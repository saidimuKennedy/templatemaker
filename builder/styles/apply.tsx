/**
 * Style application helpers. Styles travel through ComponentRenderer via
 * props.style because the renderer contract is frozen to { id, props, children }.
 */

import { Fragment, type CSSProperties, type ReactElement } from "react";
import type { BuilderDocument, BuilderNode, BuilderPage, NodeProps } from "../document/types";
import type { ComponentDefinition, ComponentRenderer } from "../registry/types";
import type { RenderContext, Renderer } from "../renderer/types";
import { resolveNodeStyle } from "./resolve";
import { defaultTokens } from "./tokens";
import type { Breakpoint, DesignTokens, NodeStyleRules, StyledProps } from "./types";

export type { StyledProps };

function mergeStyleObjects(
  existing: unknown,
  resolved: CSSProperties,
): CSSProperties {
  if (
    existing &&
    typeof existing === "object" &&
    !Array.isArray(existing)
  ) {
    return { ...(existing as CSSProperties), ...resolved };
  }
  return resolved;
}

/** Merge resolved node styles into the props bag passed to ComponentRenderer. */
export function mergeStyleIntoProps(
  node: BuilderNode,
  breakpoint: Breakpoint,
  tokens: DesignTokens = defaultTokens,
): NodeProps {
  const resolvedStyle = resolveNodeStyle(
    node.styles as NodeStyleRules,
    breakpoint,
    tokens,
  );

  return {
    ...node.props,
    style: mergeStyleObjects(node.props.style, resolvedStyle),
  };
}

/**
 * Wrap a ComponentDefinition so its renderer resolves optional
 * `props.styleRules` (NodeStyleRules) into `props.style`. Useful when
 * styles are passed through props without changing ComponentRenderer's
 * signature; tree-level resolution should prefer mergeStyleIntoProps /
 * createStyledRenderer.
 */
export function withResolvedStyles(
  definition: ComponentDefinition,
  breakpoint: Breakpoint,
  tokens: DesignTokens = defaultTokens,
): ComponentDefinition {
  const OriginalRenderer = definition.renderer;

  const WrappedRenderer: ComponentRenderer = ({ id, props, children }) => {
    const { styleRules, style: existingStyle, ...rest } = props as NodeProps & {
      styleRules?: NodeStyleRules;
      style?: CSSProperties;
    };

    const nextProps =
      styleRules !== undefined
        ? {
            ...rest,
            style: mergeStyleObjects(
              existingStyle,
              resolveNodeStyle(styleRules, breakpoint, tokens),
            ),
          }
        : props;

    return (
      <OriginalRenderer id={id} props={nextProps}>
        {children}
      </OriginalRenderer>
    );
  };

  return {
    ...definition,
    renderer: WrappedRenderer,
  };
}

function renderStyledNode(
  node: BuilderNode,
  context: RenderContext,
  breakpoint: Breakpoint,
  tokens: DesignTokens,
): ReactElement {
  const definition = context.registry.get(node.type);
  if (!definition) {
    throw new Error(
      `Unknown component type "${node.type}". Register it before rendering.`,
    );
  }

  const Component = definition.renderer;
  const children = node.children.map((child) =>
    renderStyledNode(child, context, breakpoint, tokens),
  );
  const props = mergeStyleIntoProps(node, breakpoint, tokens);

  return (
    <Component key={node.id} id={node.id} props={props}>
      {children}
    </Component>
  );
}

/**
 * Decorator around Renderer that resolves node styles into props.style
 * before invoking each component. Re-walks the tree (same pattern as
 * renderer.tsx) because Renderer does not expose a per-node hook.
 */
export function createStyledRenderer(
  _renderer: Renderer,
  breakpoint: Breakpoint,
  tokens: DesignTokens = defaultTokens,
): Renderer {
  return {
    renderPage(page: BuilderPage, context: RenderContext): ReactElement {
      return renderStyledNode(page.root, context, breakpoint, tokens);
    },
    renderDocument(
      document: BuilderDocument,
      context: RenderContext,
    ): ReactElement {
      return (
        <Fragment>
          {document.pages.map((page) => (
            <Fragment key={page.id}>
              {renderStyledNode(page.root, context, breakpoint, tokens)}
            </Fragment>
          ))}
        </Fragment>
      );
    },
  };
}
