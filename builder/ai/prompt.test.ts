import { describe, expect, it } from "vitest";
import { registerBuiltInComponents } from "@/builder/components";
import { STYLE_GROUPS } from "@/builder/styles/fields";
import { defaultTokens } from "@/builder/styles/tokens";
import { createComponentRegistry } from "@/builder/registry/registry";
import { buildAIPrompt, DESIGN_RECIPES } from "./prompt";
import { createDefaultDocument } from "@/lib/builder/seed";

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
});
