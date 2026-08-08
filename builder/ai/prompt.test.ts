import { describe, expect, it } from "vitest";
import { registerBuiltInComponents } from "@/builder/components";
import { createComponentRegistry } from "@/builder/registry/registry";
import { buildAIPrompt } from "./prompt";
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

  it("includes the user prompt and serialized document", () => {
    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const document = createDefaultDocument("executive", "prompt-test");
    const { user } = buildAIPrompt(registry, document, "Add a contact footer");

    expect(user).toContain("Add a contact footer");
    expect(user).toContain(document.id);
    expect(user).toContain(document.pages[0]!.id);
  });
});
