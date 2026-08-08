/**
 * One-off / CLI script: seed a real Portfolio row's content with the "Silence Studio"
 * dogfood document so we can inspect/edit an already-built complex page in the real editor.
 *
 * Run: compile with the project's tsconfig then run with node.
 */

import { PrismaClient } from "@prisma/client";
import type { BuilderNode, BuilderPage, BuilderProject } from "@/builder/document/types";
import { createPortfolioRegistry } from "@/lib/builder/registry";
import { validatePortfolioDocument } from "@/lib/builder/content";

function node(
  id: string,
  type: string,
  name: string,
  props: Record<string, unknown> = {},
  styles: Record<string, unknown> = {},
  children: BuilderNode[] = [],
): BuilderNode {
  return { id, type, name, props, styles, children };
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

export function buildDogfoodDocument(portfolioId: string): BuilderProject {
  const root = node("page-root", "Page", "Page Content", {}, {}, [
    // 1. Navbar
    node("navbar-1", "Navbar", "Navbar", {}, { base: { paddingTop: "24px", paddingBottom: "24px" } }, [
      node("navbar-container", "Container", "Container", {}, {}, [
        node("navbar-grid", "Grid", "Grid", { columns: 2 }, { base: { alignItems: "center" } }, [
          node(
            "logo-1",
            "Heading",
            "Wordmark",
            { text: "Silence Studio®", level: 2 },
            { base: { fontSize: "20px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } },
          ),
          node("navbar-right-grid", "Grid", "Grid", { columns: 3 }, { base: { alignItems: "flex-start", gap: "24px" } }, [
            node("nav-links-stack", "Stack", "Nav Links Stack", { direction: "column" }, { base: { gap: "8px" } }, [
              node("link-work", "Link", "Link - Work", { text: "Work", href: "#work" }, { base: { textDecoration: "none" } }),
              node("link-about", "Link", "Link - About", { text: "About", href: "#about" }, { base: { textDecoration: "none" } }),
              node("link-contact", "Link", "Link - Contact", { text: "Contact", href: "#contact" }, { base: { textDecoration: "none" } }),
            ]),
            node("social-links-stack", "Stack", "Social Links Stack", { direction: "column" }, { base: { gap: "8px" } }, [
              node("link-twitter", "Link", "Link - Twitter", { text: "Twitter", href: "https://twitter.com" }, { base: { textDecoration: "none" } }),
              node("link-instagram", "Link", "Link - Instagram", { text: "Instagram", href: "https://instagram.com" }, { base: { textDecoration: "none" } }),
            ]),
            node(
              "location-text",
              "Text",
              "Location Text",
              { text: "Stockholm, Sweden" },
              { base: { marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", fontSize: "14px", color: "#666666" } },
            ),
          ]),
        ]),
      ]),
    ]),

    // 2. Intro Section
    node("hero-section", "Section", "Section - Intro", { padding: "lg" }, { base: { paddingTop: "80px", paddingBottom: "80px" } }, [
      node("hero-container", "Container", "Container", {}, {}, [
        node("hero-stack", "Stack", "Intro Stack", { direction: "column" }, { base: { gap: "16px" } }, [
          node(
            "hero-heading",
            "Heading",
            "Intro Display Wrap",
            { text: "Silence", level: 1 },
            {
              base: {
                fontSize: "64px",
                fontWeight: "700",
                marginTop: "0px",
                marginBottom: "0px",
                marginLeft: "0px",
                marginRight: "0px",
                lineHeight: "0.9",
              },
              lg: { fontSize: "140px" },
            },
          ),
          node(
            "scroll-hint",
            "Text",
            "Scroll Anchor Link",
            { text: "Scroll ↓" },
            { base: { textAlign: "right", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } },
          ),
        ]),
      ]),
    ]),

    // 3. Welcome Section
    node("welcome-section", "Section", "Section - Welcome", { padding: "md" }, { base: { paddingTop: "48px", paddingBottom: "48px" } }, [
      node("welcome-container", "Container", "Container", {}, {}, [
        node("welcome-stack", "Stack", "Welcome Row Stack", { direction: "row" }, { base: { gap: "48px", alignItems: "flex-start" } }, [
          node(
            "welcome-label",
            "Text",
            "Section Title - Welcome",
            { text: "● Welcome" },
            { base: { flex: "0 0 200px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", fontWeight: "600" } },
          ),
          node(
            "welcome-body",
            "Text",
            "Text - Paragraph",
            {
              text: "Welcome to Silence Studio, a digital haven crafted by a dedicated team of creatives championing the essence of simplicity and elegance.",
            },
            { base: { flex: "1", fontSize: "20px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", lineHeight: "1.5" } },
          ),
        ]),
      ]),
    ]),

    // 4. Team Portrait Grid
    node("team-section", "Section", "Section - Team", { padding: "md" }, { base: { paddingTop: "48px", paddingBottom: "48px" } }, [
      node("team-container", "Container", "Container", {}, {}, [
        node("photo-grid", "Grid", "Team Grid", { columns: 2, gap: "md" }, {}, [
          node("photo-1", "Image", "Team Image", { src: PLACEHOLDER_PHOTO_A, alt: "Team Portrait 1" }, {}),
          node("photo-2", "Image", "Team Image", { src: PLACEHOLDER_PHOTO_B, alt: "Team Portrait 2" }, {}),
        ]),
      ]),
    ]),

    // 5. Work Intro Row
    node("work-intro-section", "Section", "Section - Work Intro", { padding: "md" }, { base: { paddingTop: "48px", paddingBottom: "24px" } }, [
      node("work-intro-container", "Container", "Container", {}, {}, [
        node("work-intro-stack", "Stack", "Work Intro Stack", { direction: "row" }, { base: { gap: "48px", alignItems: "flex-start" } }, [
          node(
            "work-label",
            "Text",
            "Section Title - Work",
            { text: "● Work" },
            { base: { flex: "0 0 200px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", fontWeight: "600" } },
          ),
          node(
            "work-philosophy",
            "Text",
            "Text - Philosophy Paragraph",
            {
              text: "We believe in quiet craftsmanship, intentional whitespace, and work that speaks through clarity rather than volume.",
            },
            { base: { flex: "1", fontSize: "20px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", lineHeight: "1.5" } },
          ),
        ]),
      ]),
    ]),

    // 6. Work List (7 bordered rows)
    node("work-list-section", "Section", "Section - Work List", { padding: "md" }, { base: { paddingTop: "24px", paddingBottom: "48px" } }, [
      node("work-list-container", "Container", "Container", {}, {}, [
        node("work-list-stack", "Stack", "Work List Stack", { direction: "column" }, { base: { gap: "0px" } }, [
          ...[
            { id: "vitality", name: "Vitality", kind: "Development", year: "2025" },
            { id: "vibe-art", name: "Vibe Art", kind: "Web design", year: "2025" },
            { id: "ink-works", name: "Ink Works", kind: "Branding", year: "2024" },
            { id: "glide-graph", name: "Glide Graph", kind: "Web design", year: "2024" },
            { id: "pixel-pod", name: "Pixel Pod", kind: "Web design", year: "2024" },
            { id: "snap-tint", name: "Snap Tint", kind: "Branding", year: "2023" },
            { id: "visual-blend", name: "Visual Blend", kind: "Branding", year: "2023" },
          ].map((project) =>
            node(
              `work-row-${project.id}`,
              "LinkBlock",
              `Work Row - ${project.name}`,
              { href: `/works/${project.id}` },
              { base: { borderBottom: "1px solid rgba(128,128,128,0.3)", paddingTop: "20px", paddingBottom: "20px" } },
              [
                node(
                  `work-row-inner-${project.id}`,
                  "Stack",
                  "Work Row Inner",
                  { direction: "row", justify: "between", align: "center" },
                  { base: { gap: "16px" } },
                  [
                    node(
                      `work-name-${project.id}`,
                      "Text",
                      "Work Item Title",
                      { text: project.name },
                      { base: { marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", fontWeight: "600" } },
                    ),
                    node(
                      `work-kind-${project.id}`,
                      "Text",
                      "Work Item Discipline",
                      { text: project.kind },
                      { base: { marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", color: "#666666" } },
                    ),
                    node(
                      `work-year-${project.id}`,
                      "Text",
                      "Work Item Year",
                      { text: project.year },
                      { base: { marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", color: "#888888" } },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ]),
      ]),
    ]),

    // 7. About Us Section
    node("about-section", "Section", "Section - About", { padding: "md" }, { base: { paddingTop: "48px", paddingBottom: "48px" } }, [
      node("about-container", "Container", "Container", {}, {}, [
        node("about-stack", "Stack", "About Row Stack", { direction: "row" }, { base: { gap: "48px", alignItems: "flex-start" } }, [
          node(
            "about-label",
            "Text",
            "Section Title - About",
            { text: "● About us" },
            { base: { flex: "0 0 200px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", fontWeight: "600" } },
          ),
          node(
            "about-body",
            "Text",
            "Text - About Paragraph",
            {
              text: "Founded in Stockholm, Silence Studio operates as an independent design and engineering practice working with forward-thinking teams globally.",
            },
            { base: { flex: "1", fontSize: "20px", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px", lineHeight: "1.5" } },
          ),
        ]),
      ]),
    ]),

    // 8. Stats Grid
    node("stats-section", "Section", "Section - Stats", { padding: "md" }, { base: { paddingTop: "48px", paddingBottom: "48px" } }, [
      node("stats-container", "Container", "Container", {}, {}, [
        node("stats-grid", "Grid", "Stats Grid", { columns: 2, gap: "lg" }, {}, [
          node("stat-block-1", "Stack", "Stat Block - Projects", { direction: "column" }, { base: { gap: "8px" } }, [
            node("stat-val-1", "Heading", "Stat Value", { text: "60", level: 3 }, { base: { fontSize: "48px", fontWeight: "700", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
            node("stat-lbl-1", "Text", "Stat Label", { text: "Projects complete" }, { base: { color: "#666666", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
          ]),
          node("stat-block-2", "Stack", "Stat Block - Experience", { direction: "column" }, { base: { gap: "8px" } }, [
            node("stat-val-2", "Heading", "Stat Value", { text: "25", level: 3 }, { base: { fontSize: "48px", fontWeight: "700", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
            node("stat-lbl-2", "Text", "Stat Label", { text: "Years of experience" }, { base: { color: "#666666", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
          ]),
          node("stat-block-3", "Stack", "Stat Block - Awards", { direction: "column" }, { base: { gap: "8px" } }, [
            node("stat-val-3", "Heading", "Stat Value", { text: "34", level: 3 }, { base: { fontSize: "48px", fontWeight: "700", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
            node("stat-lbl-3", "Text", "Stat Label", { text: "Awards received" }, { base: { color: "#666666", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
          ]),
          node("stat-block-4", "Stack", "Stat Block - Developer", { direction: "column" }, { base: { gap: "8px" } }, [
            node("stat-val-4", "Heading", "Stat Value", { text: "01", level: 3 }, { base: { fontSize: "48px", fontWeight: "700", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
            node("stat-lbl-4", "Text", "Stat Label", { text: "Happy developer" }, { base: { color: "#666666", marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
          ]),
        ]),
      ]),
    ]),

    // 9. Footer
    node("site-footer", "Footer", "Footer", {}, { base: { paddingTop: "32px", paddingBottom: "32px", marginTop: "48px" } }, [
      node("footer-container", "Container", "Container", {}, {}, [
        node("footer-stack", "Stack", "Footer Row Stack", { direction: "row", justify: "between", align: "center" }, { base: { gap: "16px" } }, [
          node("footer-copy", "Text", "Footer Copyright Text", { text: "©Copyright 2025" }, { base: { marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px" } }),
          node("footer-links", "Stack", "Footer Links Stack", { direction: "row" }, { base: { gap: "20px" } }, [
            node("footer-link-style", "Link", "Footer Link - Style guide", { text: "Style guide", href: "/style-guide" }, {}),
            node("footer-link-licenses", "Link", "Footer Link - Licenses", { text: "Licenses", href: "/licenses" }, {}),
            node("footer-link-changelog", "Link", "Footer Link - Changelog", { text: "Changelog", href: "/changelog" }, {}),
          ]),
        ]),
      ]),
    ]),
  ]);

  const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root };
  const now = new Date().toISOString();
  return {
    id: portfolioId,
    name: "Silence Studio",
    meta: { schemaVersion: 1, createdAt: now, updatedAt: now },
    pages: [page],
  };
}

if (require.main === module) {
  const PORTFOLIO_ID = process.argv[2];
  if (!PORTFOLIO_ID) {
    console.error("Usage: node seed-dogfood-portfolio.js <portfolioId>");
    process.exit(1);
  }

  const document = buildDogfoodDocument(PORTFOLIO_ID);
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
}
