import { describe, expect, it } from "vitest";
import { registerBuiltInComponents } from "@/builder/components";
import { STYLE_GROUPS } from "@/builder/styles/fields";
import { defaultTokens } from "@/builder/styles/tokens";
import { createComponentRegistry } from "@/builder/registry/registry";
import { buildStyleDigest, formatStyleDigest } from "./style-digest";
import { buildAIPrompt, DESIGN_RECIPES } from "./prompt";
import { createDefaultDocument } from "@/lib/builder/seed";
import type { BuilderDocument, BuilderNode } from "../document/types";

describe("buildAIPrompt", () => {
  it("includes every registered component type from the registry", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "prompt-test");
    const { system } = buildAIPrompt(registry, document, "Add a hero section");

    for (const definition of registry.list()) {
      expect(system).toContain(definition.type);
      for (const field of definition.propertySchema) {
        expect(system).toContain(`${field.key}:${field.type}`);
      }
    }
  });

  it("includes style groups, token palette, and section-scoped task", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "prompt-style-test");
    const { system } = buildAIPrompt(registry, document, "Add a services row");

    for (const group of STYLE_GROUPS) {
      expect(system).toContain(group.label);
      expect(system).toContain(group.fields[0]!.key);
    }

    for (const color of Object.keys(defaultTokens.colors)) {
      expect(system).toContain(color);
    }
    for (const space of Object.keys(defaultTokens.spacing)) {
      expect(system).toContain(space);
    }

    expect(system).toContain("produce ONE section");
    expect(system).toContain('styles must be breakpoint-keyed');
    expect(system).toContain("Composition recipes:");
    expect(DESIGN_RECIPES.length).toBeGreaterThan(0);
    expect(system).toContain("Overlay banner");
    expect(system).toContain("Placeholder images");
  });

  it("includes document pages for internal link guidance", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "prompt-pages-test");
    const { system } = buildAIPrompt(registry, document, "Add nav links");

    expect(system).toContain("Pages in this document:");
    expect(system).toContain(document.pages[0]!.id);
    expect(system).toContain('linkType: "page"');
  });

  it("includes the user prompt and serialized document", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "prompt-test");
    const { user } = buildAIPrompt(registry, document, "Add a contact footer");

    expect(user).toContain("Add a contact footer");
    expect(user).toContain(document.id);
    expect(user).toContain(document.pages[0]!.id);
    expect(user).toContain("one section");
  });

  it("includes the style digest when the document has authored styles", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);

    const styledDocument: BuilderDocument = {
      ...createDefaultDocument("executive", "digest-test"),
      pages: [
        {
          id: "page-1",
          name: "Home",
          path: "/",
          root: {
            id: "root",
            type: "Page",
            props: {},
            styles: {},
            children: [
              {
                id: "card",
                type: "Container",
                props: {},
                styles: { base: { borderRadius: "16px", backgroundColor: "#f1f5f9" } },
                children: [],
              } satisfies BuilderNode,
            ],
          },
        },
      ],
    };

    const digest = formatStyleDigest(buildStyleDigest(styledDocument));
    expect(digest).toContain("16px");
    expect(digest).toContain("#f1f5f9");

    const { system } = buildAIPrompt(registry, styledDocument, "Add another card row");
    expect(system).toContain("Design already in use");
    expect(system).toContain("16px");
  });

  it("omits the digest section on an empty document", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "digest-empty");
    const { system } = buildAIPrompt(registry, document, "Add a hero");

    expect(system).not.toContain("Design already in use (match these):");
    expect(formatStyleDigest(buildStyleDigest(document))).toBeNull();
  });
});
