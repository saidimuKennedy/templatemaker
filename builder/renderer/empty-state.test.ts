import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { registerBuiltInComponents } from "../components";
import { createComponentRegistry } from "../registry/registry";
import { createStyledRenderer } from "../styles/apply";
import { createRenderer } from "./renderer";

const registry = createComponentRegistry();
registerBuiltInComponents(registry);
const renderer = createStyledRenderer(createRenderer(), "base");

function pageOf(root: BuilderNode): BuilderPage {
  return { id: "p", name: "P", path: "/", root };
}

function render(root: BuilderNode, target: "editor-preview" | "published-webview"): string {
  const page = pageOf(root);
  return renderToStaticMarkup(renderer.renderPage(page, { registry, target, pages: [page] }));
}

const DIVIDER: BuilderNode = {
  id: "divider",
  type: "Container",
  props: {},
  styles: { base: { height: "1px", backgroundColor: "#e5e7eb", width: "100%" } },
  children: [],
};

const BARE: BuilderNode = {
  id: "bare",
  type: "Container",
  props: {},
  styles: {},
  children: [],
};

describe("empty-state affordance", () => {
  it("never reaches published output", () => {
    // Regression: live portfolios were shipping a dashed box reading
    // "Empty Container" to visitors.
    expect(render(BARE, "published-webview")).not.toContain("Empty Container");
    expect(render(BARE, "published-webview")).not.toContain("dashed");
  });

  it("is suppressed for a self-sized node even in the editor", () => {
    // The divider recipe is a 1px Container. A 32px placeholder does not
    // just mislabel it — it changes the design the author is looking at.
    expect(render(DIVIDER, "editor-preview")).not.toContain("Empty Container");
  });

  it("still appears for a genuinely empty container in the editor", () => {
    expect(render(BARE, "editor-preview")).toContain("Empty Container");
  });

  it("treats an explicit zero height as still needing the affordance", () => {
    const zero: BuilderNode = { ...BARE, id: "zero", styles: { base: { height: "0px" } } };
    expect(render(zero, "editor-preview")).toContain("Empty Container");
  });
});
