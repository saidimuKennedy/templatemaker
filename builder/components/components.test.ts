import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer } from "../styles/apply";
import { registerBuiltInComponents } from "./index";
import { createDefaultDocument } from "../../lib/builder/seed";
import { createPortfolioRegistry } from "../../lib/builder/registry";
import { validatePortfolioDocument } from "../../lib/builder/content";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

function makeNode(id: string, type: string, props: Record<string, unknown>, children: BuilderNode[] = []): BuilderNode {
  return { id, type, props, styles: {}, children };
}

describe("built-in layout primitives", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const renderer = createRenderer();

  it("Navbar renders with space-between justify-content", () => {
    const navbar = makeNode("navbar-1", "Navbar", {}, [
      makeNode("logo-1", "Heading", { text: "Logo", level: 1 }),
      makeNode("links-1", "Stack", { direction: "row" }, [
        makeNode("link-1", "Text", { text: "Home" }),
        makeNode("link-2", "Text", { text: "About" }),
        makeNode("link-3", "Text", { text: "Contact" }),
      ]),
    ]);
    const navbarPage: BuilderPage = { id: "page-navbar", name: "Navbar", path: "/", root: navbar };
    const navbarHtml = renderToStaticMarkup(
      renderer.renderPage(navbarPage, { registry, target: "editor-preview" }),
    );
    assert(navbarHtml.includes('data-node-type="Navbar"'), "Navbar rendered");
    assert(
      navbarHtml.includes("justify-content:space-between") || navbarHtml.includes("justify-content: space-between"),
      "Navbar has space-between justify-content",
    );
  });

  it("Grid uses mobile-first auto-fit columns", () => {
    const grid = makeNode("grid-1", "Grid", { columns: 3 }, [
      makeNode("img-1", "Image", { src: "a.png", alt: "a" }),
      makeNode("img-2", "Image", { src: "b.png", alt: "b" }),
      makeNode("img-3", "Image", { src: "c.png", alt: "c" }),
    ]);
    const gridPage: BuilderPage = { id: "page-grid", name: "Grid", path: "/", root: grid };
    const gridHtml = renderToStaticMarkup(
      renderer.renderPage(gridPage, { registry, target: "editor-preview" }),
    );
    assert(
      gridHtml.includes("auto-fit"),
      "Grid sizes tracks with auto-fit so they collapse on narrow containers",
    );
    assert(
      !gridHtml.includes("@media"),
      "Grid collapses by container width, not a viewport media query — the canvas simulates width with maxWidth, where media queries do not apply",
    );
  });

  it("Stack resolves justify and align props", () => {
    const styledStack = makeNode("stack-1", "Stack", {
      direction: "row",
      justify: "between",
      align: "center",
    });
    const stackPage: BuilderPage = { id: "page-stack", name: "Stack", path: "/", root: styledStack };
    const stackHtml = renderToStaticMarkup(
      renderer.renderPage(stackPage, { registry, target: "editor-preview" }),
    );
    assert(
      stackHtml.includes("justify-content:space-between") || stackHtml.includes("justify-content: space-between"),
      "Stack justify:between resolves to space-between",
    );
    assert(
      stackHtml.includes("align-items:center") || stackHtml.includes("align-items: center"),
      "Stack align:center resolves to center",
    );
  });

  it("pre-existing seed documents without justify/align still render with today's defaults", () => {
    const portfolioRegistry = createPortfolioRegistry();
    const seedDocument = createDefaultDocument("executive", "proj-regression");
    const validation = validatePortfolioDocument(seedDocument, portfolioRegistry);
    assert(
      validation.valid,
      `seed document should still validate: ${validation.errors.map((e) => e.message).join(", ")}`,
    );

    const seedPage = seedDocument.pages[0];
    const seedHtml = renderToStaticMarkup(
      createStyledRenderer(renderer, "base").renderPage(seedPage, {
        registry: portfolioRegistry,
        target: "editor-preview",
      }),
    );
    assert(
      seedHtml.includes("justify-content:flex-start") || seedHtml.includes("justify-content: flex-start"),
      "pre-existing seed Stack (no justify prop) falls back to flex-start, matching prior unset behavior",
    );
    assert(
      seedHtml.includes("align-items:stretch") || seedHtml.includes("align-items: stretch"),
      "pre-existing seed Stack (no align prop) falls back to stretch, matching prior unset behavior",
    );
  });
});
