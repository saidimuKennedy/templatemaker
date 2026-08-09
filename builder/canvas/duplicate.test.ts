import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderDocument, BuilderNode, BuilderPage } from "../document/types";
import { validateAgainstRegistry } from "../document/validate";
import { createComponentRegistry } from "../registry/registry";
import { createRenderer } from "../renderer/renderer";
import { registerBuiltInComponents } from "../components";
import { registerPortfolioComponents } from "../plugins/portfolio";
import { createCommandEngine } from "../history/commands";
import { cloneNodeWithNewIds, resolveDuplicateCommand } from "./duplicate";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

function collectIds(node: BuilderNode, out: string[]): void {
  out.push(node.id);
  node.children.forEach((c) => collectIds(c, out));
}

describe("node duplication", () => {
  it("cloneNodeWithNewIds produces a structurally identical, id-disjoint clone", () => {
    const original: BuilderNode = {
      id: "a",
      type: "Stack",
      props: {},
      styles: {},
      children: [
        { id: "b", type: "Text", props: {}, styles: {}, children: [] },
        {
          id: "c",
          type: "Stack",
          props: {},
          styles: {},
          children: [{ id: "d", type: "Text", props: {}, styles: {}, children: [] }],
        },
      ],
    };
    const clone = cloneNodeWithNewIds(original);
    const oIds: string[] = [];
    collectIds(original, oIds);
    const cIds: string[] = [];
    collectIds(clone, cIds);
    const disjoint = oIds.every((id) => !cIds.includes(id));
    assert(disjoint, "clone shares no ids with the original across all levels");
    assert(clone.children.length === 2 && clone.children[1].children.length === 1, "clone preserves structure");
  });

  it("resolveDuplicateCommand inserts a copy right after the original and applies", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    registerPortfolioComponents(registry);

    const root: BuilderNode = {
      id: "page-root",
      type: "Page",
      props: {},
      styles: {},
      children: [
        { id: "text-1", type: "Text", props: { text: "Hello" }, styles: {}, children: [] },
        { id: "text-2", type: "Text", props: { text: "World" }, styles: {}, children: [] },
      ],
    };
    const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root };
    const doc: BuilderDocument = {
      id: "proj-1",
      name: "Test",
      meta: { schemaVersion: 1, createdAt: "now", updatedAt: "now" },
      pages: [page],
    };

    const dupCommand = resolveDuplicateCommand(doc, "page-1", "text-1");
    assert(
      dupCommand !== undefined && dupCommand.type === "CreateNode",
      "resolveDuplicateCommand returns CreateNode",
    );
    const engine = createCommandEngine();
    const dupResult = engine.apply(doc, dupCommand!);
    assert(dupResult.ok, "duplicate command applies successfully");
    if (dupResult.ok) {
      const newRoot = dupResult.result.document.pages[0].root;
      assert(newRoot.children.length === 3, "root now has 3 children after duplicate");
      assert(newRoot.children[1].props.text === "Hello", "duplicate inserted right after original with same content");
      assert(newRoot.children[1].id !== "text-1", "duplicate has a new id");
    }

    const rootDup = resolveDuplicateCommand(doc, "page-1", "page-root");
    assert(rootDup === undefined, "duplicating the page root returns undefined");
  });

  it("Page rootOnly constraint is enforced by validateAgainstRegistry", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    registerPortfolioComponents(registry);

    const page: BuilderPage = {
      id: "page-1",
      name: "Home",
      path: "/",
      root: { id: "page-root", type: "Page", props: {}, styles: {}, children: [] },
    };
    const doc: BuilderDocument = {
      id: "proj-1",
      name: "Test",
      meta: { schemaVersion: 1, createdAt: "now", updatedAt: "now" },
      pages: [page],
    };

    const nestedPageDoc: BuilderDocument = {
      ...doc,
      pages: [
        {
          ...page,
          root: {
            id: "page-root",
            type: "Page",
            props: {},
            styles: {},
            children: [{ id: "nested-page", type: "Page", props: {}, styles: {}, children: [] }],
          },
        },
      ],
    };
    const nestedResult = validateAgainstRegistry(nestedPageDoc, registry);
    assert(!nestedResult.valid, "Page nested inside another node fails validation");
    assert(
      nestedResult.errors.some((e) => e.message.includes("may only be used as a page root")),
      "error message names the rootOnly violation",
    );

    const validRootResult = validateAgainstRegistry(doc, registry);
    assert(validRootResult.valid, "Page as an actual page root still validates");
  });

  it("empty business components render a labelled placeholder instead of collapsing to nothing", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    registerPortfolioComponents(registry);
    const renderer = createRenderer();

    function renderNode(node: BuilderNode): string {
      const p: BuilderPage = { id: "p", name: "p", path: "/", root: node };
      return renderToStaticMarkup(renderer.renderPage(p, { registry, target: "editor-preview", pages: [p] }));
    }

    const emptyProfile = renderNode({ id: "ph-1", type: "ProfileHeader", props: {}, styles: {}, children: [] });
    assert(emptyProfile.includes("Empty ProfileHeader"), "empty ProfileHeader shows placeholder");

    const filledProfile = renderNode({
      id: "ph-2",
      type: "ProfileHeader",
      props: { name: "Jane" },
      styles: {},
      children: [],
    });
    assert(!filledProfile.includes("Empty ProfileHeader"), "ProfileHeader with content does not show placeholder");
    assert(filledProfile.includes("Jane"), "ProfileHeader with content renders it");

    const emptyProject = renderNode({ id: "pc-1", type: "ProjectCard", props: {}, styles: {}, children: [] });
    assert(emptyProject.includes("Empty ProjectCard"), "empty ProjectCard shows placeholder");

    const emptySkill = renderNode({ id: "sg-1", type: "SkillGroup", props: {}, styles: {}, children: [] });
    assert(emptySkill.includes("Empty SkillGroup"), "empty SkillGroup shows placeholder");

    const emptyLinks = renderNode({ id: "ll-1", type: "LinksList", props: {}, styles: {}, children: [] });
    assert(emptyLinks.includes("Empty LinksList"), "empty LinksList shows placeholder");
    assert(
      emptyLinks.startsWith("<ul") && emptyLinks.includes("<li"),
      "empty LinksList placeholder still wrapped in <li> for valid HTML",
    );
  });
});
