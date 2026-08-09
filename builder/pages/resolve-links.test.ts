import { describe, expect, it } from "vitest";
import type { BuilderNode, BuilderPage } from "../document/types";
import { joinBasePath, mergePageLinksIntoProps } from "./resolve-links";

function page(id: string, path: string): BuilderPage {
  return { id, name: id, path, root: { id: `${id}-root`, type: "Page", props: {}, styles: {}, children: [] } };
}

function link(props: Record<string, unknown>): BuilderNode {
  return { id: "link-1", type: "Link", props, styles: {}, children: [] };
}

const PAGES = [page("home", "/"), page("work", "/work")];

/**
 * Page paths are document-relative but a portfolio is served from
 * `/p/<slug>`. Emitting the bare path navigates to the site root, where the
 * route does not exist — the link looks correct in the editor and 404s
 * everywhere else.
 */
describe("joinBasePath", () => {
  it("mounts a page path under the base path", () => {
    expect(joinBasePath("/p/silence-studio", "/work")).toBe("/p/silence-studio/work");
  });

  it("maps the index page to the mount point itself", () => {
    // `/p/slug/` would be a second URL serving identical content.
    expect(joinBasePath("/p/silence-studio", "/")).toBe("/p/silence-studio");
  });

  it("tolerates a trailing slash on the base path", () => {
    expect(joinBasePath("/p/silence-studio/", "/work")).toBe("/p/silence-studio/work");
  });

  it("returns the bare path when unmounted, for the editor canvas", () => {
    expect(joinBasePath(undefined, "/work")).toBe("/work");
    expect(joinBasePath("", "/work")).toBe("/work");
  });

  it("normalizes a page path that omits its leading slash", () => {
    expect(joinBasePath("/p/x", "work")).toBe("/p/x/work");
  });
});

describe("mergePageLinksIntoProps", () => {
  it("resolves a page link against the mount point", () => {
    const props = mergePageLinksIntoProps(
      link({ linkType: "page", pageId: "work" }),
      { linkType: "page", pageId: "work" },
      PAGES,
      "/p/silence-studio",
    );
    expect(props.href).toBe("/p/silence-studio/work");
  });

  it("leaves url links untouched", () => {
    const props = mergePageLinksIntoProps(
      link({ linkType: "url", href: "https://example.com" }),
      { linkType: "url", href: "https://example.com" },
      PAGES,
      "/p/silence-studio",
    );
    expect(props.href).toBe("https://example.com");
  });

  it("omits href for a deleted target rather than guessing a path", () => {
    // resolvePageByPath falls back to the index page, so a guessed path would
    // render the wrong page instead of failing visibly.
    const props = mergePageLinksIntoProps(
      link({ linkType: "page", pageId: "gone" }),
      { linkType: "page", pageId: "gone" },
      PAGES,
      "/p/silence-studio",
    );
    expect(props.href).toBeUndefined();
  });
});
