import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer, mergeStyleIntoProps, resolveNodeStyle } from "./index";
import type { ComponentDefinition } from "../registry/types";
import type { NodeStyleRules } from "./types";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

describe("style engine", () => {
  it("resolveNodeStyle cascades base -> sm/md/lg, mobile-first", () => {
    const styleRules: NodeStyleRules = {
      base: { color: "red", padding: "8px" },
      md: { color: "blue", fontSize: "18px" },
    };

    const atBase = resolveNodeStyle(styleRules, "base");
    assert(atBase.color === "red", "base should include base color");
    assert(atBase.padding === "8px", "base should include base padding");
    assert(atBase.fontSize === undefined, "base should not include md override");

    const atMd = resolveNodeStyle(styleRules, "md");
    assert(atMd.color === "blue", "md should override base color");
    assert(atMd.padding === "8px", "md should inherit base padding");
    assert(atMd.fontSize === "18px", "md should include md fontSize");
  });

  it("createStyledRenderer resolves styles into props.style at a given breakpoint", () => {
    const BoxRenderer = ({
      id,
      props,
      children,
    }: {
      readonly id: string;
      readonly props: Record<string, unknown>;
      readonly children?: React.ReactNode;
    }) =>
      createElement(
        "div",
        { "data-node-id": id, style: props.style as React.CSSProperties | undefined },
        children,
      );

    const boxDefinition: ComponentDefinition = {
      type: "SmokeBox",
      category: "Layout",
      icon: () => null,
      renderer: BoxRenderer,
      defaultProps: {},
      propertySchema: [],
      constraints: {},
    };

    const rootNode: BuilderNode = {
      id: "root-1",
      type: "SmokeBox",
      props: { label: "hello" },
      styles: {
        base: { backgroundColor: "#f0f0f0", margin: "4px" },
        sm: { margin: "8px" },
      },
      children: [],
    };

    const page: BuilderPage = { id: "page-1", name: "Smoke", path: "/smoke", root: rootNode };

    const registry = createComponentRegistry();
    registry.register(boxDefinition);

    const baseRenderer = createRenderer();
    const styledRenderer = createStyledRenderer(baseRenderer, "sm");
    const context = { registry, target: "editor-preview" as const };

    const element = styledRenderer.renderPage(page, context);
    const html = renderToStaticMarkup(element);

    assert(html.includes('data-node-id="root-1"'), "rendered root node");
    assert(
      html.includes("background-color:#f0f0f0") || html.includes("background-color: rgb(240, 240, 240)"),
      "rendered resolved background color",
    );
    assert(html.includes("margin:8px") || html.includes("margin: 8px"), "rendered sm margin override");

    const merged = mergeStyleIntoProps(rootNode, "sm");
    assert((merged.style as { margin?: string }).margin === "8px", "mergeStyleIntoProps applies cascade");
  });
});
