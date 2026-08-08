import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { createStyledRenderer } from "../styles/apply";
import { registerBuiltInComponents } from "./index";

function node(
  id: string,
  type: string,
  props: Record<string, unknown>,
  styles: BuilderNode["styles"] = {},
  children: BuilderNode[] = [],
): BuilderNode {
  return { id, type, props, styles, children };
}

describe("Icon component", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const renderer = createStyledRenderer(createRenderer(), "base");

  it("renders a known icon", () => {
    const page: BuilderPage = {
      id: "page-icon",
      name: "Icon",
      path: "/",
      root: node("root", "Container", {}, {}, [
        node("icon-1", "Icon", { name: "listen" }, { base: { fontSize: "24px", color: "#166534" } }),
      ]),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "editor-preview" }),
    );
    expect(html).toContain('data-node-type="Icon"');
    expect(html).toContain('data-node-id="icon-1"');
  });

  it("renders fallback for unknown icon names", () => {
    const page: BuilderPage = {
      id: "page-icon-fallback",
      name: "Icon fallback",
      path: "/",
      root: node("root", "Container", {}, {}, [
        node("icon-bad", "Icon", { name: "does-not-exist" }, {}),
      ]),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "published-webview" }),
    );
    expect(html).toContain('data-node-type="Icon"');
    expect(html).toContain("<svg");
  });

  it("lists icon enum in property schema for AI prompt", () => {
    const definition = registry.get("Icon");
    expect(definition?.propertySchema[0]?.options?.some((option) => option.value === "listen")).toBe(
      true,
    );
  });

  // lucide renders `aria-hidden="true"` on its own <svg>, so assertions here
  // target the wrapper <span> the Icon component controls, not the whole
  // markup — otherwise the inner svg satisfies every aria-hidden check.
  function wrapperTag(html: string): string {
    const match = html.match(/<span[^>]*data-node-type="Icon"[^>]*>/);
    return match?.[0] ?? "";
  }

  it("hides decorative icons from the accessibility tree", () => {
    const page: BuilderPage = {
      id: "page-icon-a11y",
      name: "Icon a11y",
      path: "/",
      root: node("icon-deco", "Icon", { name: "star" }, {}),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "published-webview" }),
    );
    // An icon beside a heading carries no meaning of its own; exposing it
    // as an unlabeled graphic is worse than hiding it.
    expect(wrapperTag(html)).toContain('aria-hidden="true"');
    expect(wrapperTag(html)).not.toContain('role="img"');
  });

  it("exposes a labelled icon as an img with an accessible name", () => {
    const page: BuilderPage = {
      id: "page-icon-labelled",
      name: "Icon labelled",
      path: "/",
      root: node("icon-labelled", "Icon", { name: "mail", label: "Email us" }, {}),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "published-webview" }),
    );
    // role="img" + aria-label on the wrapper, with the inner svg hidden, is
    // the standard pattern: the name comes from the label, not the graphic.
    expect(wrapperTag(html)).toContain('role="img"');
    expect(wrapperTag(html)).toContain('aria-label="Email us"');
    expect(wrapperTag(html)).not.toContain('aria-hidden="true"');
  });
});

describe("Image overlay and cropping", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const renderer = createStyledRenderer(createRenderer(), "base");

  it("renders overlay stack with image and absolute scrim container", () => {
    const page: BuilderPage = {
      id: "page-overlay",
      name: "Overlay",
      path: "/",
      root: node(
        "frame",
        "Container",
        {},
        {
          base: {
            position: "relative",
            overflow: "hidden",
            borderRadius: "24px",
          },
        },
        [
          node(
            "photo",
            "Image",
            { src: "/placeholders/banner-wide.jpg", alt: "Banner", objectFit: "cover", aspectRatio: "16/9" },
            { base: { width: "100%", height: "100%" } },
          ),
          node(
            "scrim",
            "Container",
            {},
            {
              base: {
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundImage: "linear-gradient(transparent, rgba(0,0,0,.45))",
              },
            },
            [node("title", "Heading", { text: "Overlay title", level: 2 }, {})],
          ),
        ],
      ),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "published-webview" }),
    );
    expect(html).toContain('data-node-type="Image"');
    expect(html).toContain('data-node-type="Container"');
    expect(html).toContain("Overlay title");
  });

  it("applies objectFit cover with aspectRatio", () => {
    const page: BuilderPage = {
      id: "page-crop",
      name: "Crop",
      path: "/",
      root: node("img", "Image", {
        src: "/placeholders/portrait-plant.jpg",
        alt: "Plant",
        objectFit: "cover",
        aspectRatio: "3/4",
      }),
    };

    const html = renderToStaticMarkup(
      renderer.renderPage(page, { registry, target: "published-webview" }),
    );
    expect(html).toMatch(/aspect-ratio:3\/4|aspect-ratio: 3 \/ 4/);
    expect(html).toMatch(/object-fit:cover|object-fit: cover/);
  });
});
