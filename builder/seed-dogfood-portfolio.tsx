/**
 * One-off: seed a real Portfolio row's content with the "Silence Studio"
 * dogfood document (see builder/dogfood.tsx) so we can inspect/edit an
 * already-built complex page in the real editor, instead of
 * reconstructing it node-by-node through the slow click UI.
 *
 * Run: compile with the project's tsconfig then run with node.
 */

import { PrismaClient } from "@prisma/client";
import type { BuilderNode, BuilderPage, BuilderProject } from "./document/types";
import { createPortfolioRegistry } from "../lib/builder/registry";
import { validatePortfolioDocument } from "../lib/builder/content";

const PORTFOLIO_ID = process.argv[2];
if (!PORTFOLIO_ID) {
  console.error("Usage: node seed-dogfood-portfolio.js <portfolioId>");
  process.exit(1);
}

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
        {
          base: { fontSize: "64px", fontWeight: "700", margin: "0", lineHeight: "0.9" },
          lg: { fontSize: "140px" },
        },
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

const now = new Date().toISOString();
const document: BuilderProject = {
  id: PORTFOLIO_ID,
  name: "Silence Studio",
  meta: { schemaVersion: 1, createdAt: now, updatedAt: now },
  pages: [page],
};

const registry = createPortfolioRegistry();
const validation = validatePortfolioDocument(document, registry);
if (!validation.valid) {
  console.error("Document failed validation:", validation.errors);
  process.exit(1);
}

const prisma = new PrismaClient();
prisma.portfolio
  .update({
    where: { id: PORTFOLIO_ID },
    data: { content: document as object, title: "Silence Studio" },
  })
  .then((row) => {
    console.log("Seeded portfolio content for", row.id);
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error("Failed to seed:", error);
    process.exit(1);
  });
