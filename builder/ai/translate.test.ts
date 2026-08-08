import { describe, expect, it } from "vitest";
import { createPortfolioRegistry } from "@/lib/builder/registry";
import { createDefaultDocument } from "@/lib/builder/seed";
import { translateOperations } from "./translate";

describe("translateOperations", () => {
  it("translates create operations to CreateNode commands", () => {
    const registry = createPortfolioRegistry();
    const document = createDefaultDocument("executive", "translate-test");
    const page = document.pages[0]!;
    const newId = "ai-node-1";

    const commands = translateOperations(
      [
        {
          op: "create",
          id: newId,
          pageId: page.id,
          parentId: page.root.id,
          componentType: "Section",
          props: { padding: "lg" },
        },
      ],
      document,
      registry,
    );

    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      type: "CreateNode",
      payload: {
        pageId: page.id,
        parentId: page.root.id,
        node: {
          id: newId,
          type: "Section",
          props: { padding: "lg" },
        },
      },
    });
  });

  it("normalizes flat styles into base on create", () => {
    const registry = createPortfolioRegistry();
    const document = createDefaultDocument("executive", "translate-styles");
    const page = document.pages[0]!;

    const commands = translateOperations(
      [
        {
          op: "create",
          id: "styled-node",
          pageId: page.id,
          parentId: page.root.id,
          componentType: "Container",
          styles: {
            backgroundColor: "#f1f5f9",
            borderRadius: "16px",
          } as never,
        },
      ],
      document,
      registry,
    );

    expect(commands[0]).toMatchObject({
      type: "CreateNode",
      payload: {
        node: {
          styles: {
            base: {
              backgroundColor: "#f1f5f9",
              borderRadius: "16px",
            },
          },
        },
      },
    });
  });

  it("rejects unknown component types", () => {
    const registry = createPortfolioRegistry();
    const document = createDefaultDocument("executive", "translate-unknown");
    const page = document.pages[0]!;

    expect(() =>
      translateOperations(
        [
          {
            op: "create",
            id: "bad-node",
            pageId: page.id,
            parentId: page.root.id,
            componentType: "NotARealComponent",
          },
        ],
        document,
        registry,
      ),
    ).toThrow('Unknown component type "NotARealComponent"');
  });
});
