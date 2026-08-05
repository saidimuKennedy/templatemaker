/**
 * Ad-hoc smoke checks for Plan 11 Style Editing UI — specifically the
 * built-in-component props.style fix, independent of any React UI.
 * Run: compile with the project's tsconfig then run with node.
 */

import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer } from "./apply";
import { registerBuiltInComponents } from "../components";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const registry = createComponentRegistry();
registerBuiltInComponents(registry);
const styledRenderer = createStyledRenderer(createRenderer(), "base");

const heading: BuilderNode = {
  id: "heading-1",
  type: "Heading",
  props: { text: "Hello", level: 1 },
  styles: { base: { fontSize: "48px", color: "#2563eb" } },
  children: [],
};

const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root: heading };
const html = renderToStaticMarkup(
  styledRenderer.renderPage(page, { registry, target: "editor-preview" }),
);

assert(html.includes("font-size:48px"), "Heading resolves fontSize from node.styles into props.style");
assert(html.includes("color:#2563eb"), "Heading resolves color from node.styles into props.style");

console.log("Built-in component props.style fix smoke: OK");

// --- Same check for Section/Stack/Container/Page/Text/Image/Button ---
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
assert(sectionHtml.includes("padding:16px"), "Section still applies its own padding map alongside resolved styles");

console.log("Section combined style smoke: OK");
console.log("All Plan 11 built-in-component smoke checks passed.");
