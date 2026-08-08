import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer } from "./apply";
import { registerBuiltInComponents } from "../components";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

describe("built-in components apply props.style", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const styledRenderer = createStyledRenderer(createRenderer(), "base");

  it("Heading resolves fontSize/color from node.styles into props.style", () => {
    const heading: BuilderNode = {
      id: "heading-1",
      type: "Heading",
      props: { text: "Hello", level: 1 },
      styles: { base: { fontSize: "48px", color: "#2563eb" } },
      children: [],
    };

    const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root: heading };
    const html = renderToStaticMarkup(styledRenderer.renderPage(page, { registry, target: "editor-preview" }));

    assert(html.includes("font-size:48px"), "Heading resolves fontSize from node.styles into props.style");
    assert(html.includes("color:#2563eb"), "Heading resolves color from node.styles into props.style");
  });

  it("Section applies resolved styles alongside its own computed padding", () => {
    const section: BuilderNode = {
      id: "section-1",
      type: "Section",
      props: { padding: "md" },
      styles: { base: { backgroundColor: "#f1f5f9" } },
      children: [],
    };
    const sectionHtml = renderToStaticMarkup(
      styledRenderer.renderPage(
        { id: "page-2", name: "Section", path: "/", root: section },
        { registry, target: "editor-preview" },
      ),
    );
    assert(sectionHtml.includes("background-color:#f1f5f9"), "Section resolves background from node.styles");
    assert(
      sectionHtml.includes("padding:16px"),
      "Section still applies its own padding map alongside resolved styles",
    );
  });
});
