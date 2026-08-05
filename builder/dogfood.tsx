/**
 * Dogfood script: build a document approximating a real reference page
 * (nav with logo/links, big hero headline + scroll hint, two-column
 * welcome text, two-photo grid) using ONLY the real engine — registry,
 * components, Style Engine — and render it to a real standalone HTML
 * file so we can actually look at it and see what's missing.
 *
 * Run: compile with the project's tsconfig, then `node` the output.
 */

import { writeFileSync } from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "./document/types";
import { createPortfolioRegistry } from "../lib/builder/registry";
import { createRenderer } from "./renderer/renderer";
import { createStyledRenderer } from "./styles/apply";

function node(
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  styles: Record<string, unknown> = {},
  children: BuilderNode[] = [],
): BuilderNode {
  return { id, type, props, styles, children };
}

const PLACEHOLDER_PHOTO_A =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#c9c2b8"/></svg>',
  );
const PLACEHOLDER_PHOTO_B =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#a8998a"/></svg>',
  );

const root = node("page-root", "Page", {}, {}, [
  node("navbar-1", "Navbar", {}, { base: { padding: "24px 0" } }, [
    node("logo-1", "Heading", { text: "Silence Studio®", level: 2 }, { base: { fontSize: "20px", margin: "0" } }),
    node("nav-links-1", "Stack", { direction: "row" }, { base: { gap: "24px" } }, [
      node("link-work", "Text", { text: "Work" }, { base: { margin: "0" } }),
      node("link-about", "Text", { text: "About" }, { base: { margin: "0" } }),
      node("link-contact", "Text", { text: "Contact" }, { base: { margin: "0" } }),
    ]),
  ]),
  node("hero-section", "Section", { padding: "lg" }, { base: { paddingTop: "80px", paddingBottom: "80px" } }, [
    node("hero-stack", "Stack", { direction: "column" }, {}, [
      node(
        "hero-heading",
        "Heading",
        { text: "Silence", level: 1 },
        { base: { fontSize: "140px", fontWeight: "700", margin: "0", lineHeight: "0.9" } },
      ),
      node("scroll-hint", "Text", { text: "Scroll ↓" }, { base: { textAlign: "right", margin: "0" } }),
    ]),
  ]),
  node("welcome-section", "Section", { padding: "md" }, {}, [
    node("welcome-stack", "Stack", { direction: "row" }, { base: { gap: "48px", alignItems: "flex-start" } }, [
      node("welcome-label", "Text", { text: "● Welcome" }, { base: { flex: "0 0 200px", margin: "0" } }),
      node(
        "welcome-body",
        "Text",
        {
          text: "Welcome to Silence Studio, a digital haven crafted by a dedicated team of creatives championing the essence of simplicity and elegance.",
        },
        { base: { flex: "1", fontSize: "20px", margin: "0" } },
      ),
    ]),
  ]),
  node("photo-grid", "Grid", { columns: 2, gap: "md" }, {}, [
    node("photo-1", "Image", { src: PLACEHOLDER_PHOTO_A, alt: "Portrait 1" }, {}),
    node("photo-2", "Image", { src: PLACEHOLDER_PHOTO_B, alt: "Portrait 2" }, {}),
  ]),
]);

const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root };

const registry = createPortfolioRegistry();
const renderer = createStyledRenderer(createRenderer(), "base");
const bodyHtml = renderToStaticMarkup(
  renderer.renderPage(page, { registry, target: "published-webview" }),
);

const fullHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Dogfood — Silence Studio approximation</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

writeFileSync("/tmp/dogfood.html", fullHtml, "utf8");
console.log("Wrote /tmp/dogfood.html");
