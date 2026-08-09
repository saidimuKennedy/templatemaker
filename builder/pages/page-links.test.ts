import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer } from "../styles/apply";
import { registerBuiltInComponents } from "../components";
import { suggestPath, validatePageSlug } from "./suggest-path";
import { mergePageLinksIntoProps } from "./resolve-links";

function makeNode(
  id: string,
  type: string,
  props: Record<string, unknown>,
  children: BuilderNode[] = [],
): BuilderNode {
  return { id, type, props, styles: {}, children };
}

describe("page link resolution", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const baseRenderer = createRenderer();
  const styledRenderer = createStyledRenderer(baseRenderer, "base");

  const homePage: BuilderPage = {
    id: "page-home",
    name: "Home",
    path: "/",
    root: makeNode("root-home", "Page", {}),
  };

  const aboutPage: BuilderPage = {
    id: "page-about",
    name: "About",
    path: "/about",
    root: makeNode("root-about", "Page", {}),
  };

  const pages = [homePage, aboutPage];

  it("resolves a page-type link to its target's current path", () => {
    const link = makeNode("link-1", "Link", {
      text: "About us",
      linkType: "page",
      pageId: aboutPage.id,
      href: "/stale-path",
    });
    const page: BuilderPage = { ...homePage, root: link };

    const html = renderToStaticMarkup(
      styledRenderer.renderPage(page, {
        registry,
        target: "published-webview",
        pages,
      }),
    );

    expect(html).toContain('href="/about"');
    expect(html).not.toContain("/stale-path");
  });

  it("updates rendered href when the target page path changes without editing the link", () => {
    const link = makeNode("link-1", "Link", {
      text: "About",
      linkType: "page",
      pageId: aboutPage.id,
    });
    const page: BuilderPage = { ...homePage, root: link };
    const renamedPages = pages.map((entry) =>
      entry.id === aboutPage.id ? { ...entry, path: "/our-story" } : entry,
    );

    const html = renderToStaticMarkup(
      baseRenderer.renderPage(page, {
        registry,
        target: "editor-preview",
        pages: renamedPages,
      }),
    );

    expect(html).toContain('href="/our-story"');
  });

  it("renders without href when the target page was deleted", () => {
    const link = makeNode("link-1", "Link", {
      text: "Missing",
      linkType: "page",
      pageId: "deleted-page",
    });
    const page: BuilderPage = { ...homePage, root: link };

    expect(() =>
      renderToStaticMarkup(
        styledRenderer.renderPage(page, {
          registry,
          target: "published-webview",
          pages: [homePage],
        }),
      ),
    ).not.toThrow();

    const html = renderToStaticMarkup(
      styledRenderer.renderPage(page, {
        registry,
        target: "published-webview",
        pages: [homePage],
      }),
    );

    expect(html).not.toMatch(/href="/);
  });

  it("leaves url-type links unchanged", () => {
    const link = makeNode("link-1", "Link", {
      text: "Twitter",
      href: "https://twitter.com",
      newTab: true,
    });
    const page: BuilderPage = { ...homePage, root: link };

    const html = renderToStaticMarkup(
      baseRenderer.renderPage(page, {
        registry,
        target: "editor-preview",
        pages,
      }),
    );

    expect(html).toContain('href="https://twitter.com"');
    expect(html).toContain('target="_blank"');
  });

  it("resolves LinkBlock page references the same way", () => {
    const block = makeNode("block-1", "LinkBlock", {
      linkType: "page",
      pageId: aboutPage.id,
    });
    const page: BuilderPage = { ...homePage, root: block };

    const html = renderToStaticMarkup(
      styledRenderer.renderPage(page, {
        registry,
        target: "editor-preview",
        pages,
      }),
    );

    expect(html).toContain('href="/about"');
  });

  it("mergePageLinksIntoProps omits href for dangling references", () => {
    const node = makeNode("link-1", "Link", {
      linkType: "page",
      pageId: "missing",
      href: "/old",
    });
    const props = mergePageLinksIntoProps(node, node.props, pages);
    expect(props).not.toHaveProperty("href");
  });
});

describe("suggestPath", () => {
  const pages: BuilderPage[] = [
    { id: "p1", name: "Home", path: "/", root: makeNode("r1", "Page", {}) },
    { id: "p2", name: "About", path: "/about", root: makeNode("r2", "Page", {}) },
  ];

  it("slugifies and de-duplicates paths", () => {
    expect(suggestPath("Contact Us", pages)).toBe("/contact-us");
    expect(suggestPath("About", pages)).toBe("/about-2");
  });

  it("rejects colliding slugs with a named conflict", () => {
    expect(validatePageSlug("about", pages, "p3")).toMatch(/About/);
  });
});
