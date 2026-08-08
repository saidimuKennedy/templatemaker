import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, BuilderPage } from "../../document/types";
import { PageComponent } from "../../components/page";
import { createComponentRegistry } from "../../registry/registry";
import { createRenderer } from "../../renderer/renderer";
import { registerPortfolioComponents } from "./index";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

function makeNode(id: string, type: string, props: Record<string, unknown>): BuilderNode {
  return { id, type, props, styles: {}, children: [] };
}

describe("portfolio business components", () => {
  it("render correctly, including comma-list parsing and mailto links", () => {
    const children: BuilderNode[] = [
      makeNode("profile-1", "ProfileHeader", {
        name: "Jane Doe",
        tagline: "Engineer",
        bio: "Bio text",
        location: "Nairobi",
      }),
      makeNode("project-1", "ProjectCard", {
        title: "Portfolio",
        description: "This site",
        url: "https://example.com",
        tags: "react, typescript",
        featured: true,
      }),
      makeNode("skills-1", "SkillGroup", {
        category: "Languages",
        items: "Go, SQL, ",
      }),
      makeNode("links-1", "LinksList", {
        github: "https://github.com/jane",
        email: "jane@example.com",
      }),
    ];

    const root: BuilderNode = { id: "page-root", type: "Page", props: {}, styles: {}, children };
    const page: BuilderPage = { id: "page-1", name: "Portfolio Smoke", path: "/", root };

    const registry = createComponentRegistry();
    registry.register(PageComponent);
    registerPortfolioComponents(registry);

    const renderer = createRenderer();
    const html = renderToStaticMarkup(renderer.renderPage(page, { registry, target: "editor-preview" }));

    assert(html.includes('data-node-id="profile-1"'), "ProfileHeader rendered");
    assert(html.includes('data-role="tagline"'), "ProfileHeader tagline attribute");
    assert(html.includes('data-node-id="project-1"'), "ProjectCard rendered");
    assert(html.includes('data-featured="true"'), "ProjectCard featured attribute");
    assert(html.includes("react"), "ProjectCard tags rendered");
    assert(html.includes("typescript"), "ProjectCard tags rendered");
    assert(html.includes('data-node-id="skills-1"'), "SkillGroup rendered");
    assert(html.includes("<li>Go</li>"), "SkillGroup Go item");
    assert(html.includes("<li>SQL</li>"), "SkillGroup SQL item");
    assert(!html.includes("<li></li>"), "SkillGroup trailing empty entry dropped");
    assert(html.includes('data-node-id="links-1"'), "LinksList rendered");
    assert(html.includes('href="mailto:jane@example.com"'), "LinksList mailto link");
  });
});
