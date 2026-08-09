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

  it("hoists legacy Grid layout props into styles on create", () => {
    const registry = createPortfolioRegistry();
    const document = createDefaultDocument("executive", "translate-grid-layout");
    const page = document.pages[0]!;

    const commands = translateOperations(
      [
        {
          op: "create",
          id: "grid-node",
          pageId: page.id,
          parentId: page.root.id,
          componentType: "Grid",
          props: { columns: 3, gap: "md" },
        },
      ],
      document,
      registry,
    );

    const node = commands[0]?.type === "CreateNode" ? commands[0].payload.node : undefined;
    expect(node?.props).toEqual({});
    const base = node?.styles.base as Record<string, string | number> | undefined;
    expect(base).toMatchObject({
      display: "grid",
      gap: "16px",
    });
    expect(String(base?.gridTemplateColumns)).toContain("auto-fit");
  });

  it("rejects page link targets that do not exist", () => {
    const registry = createPortfolioRegistry();
    const document = createDefaultDocument("executive", "translate-page-link");
    const page = document.pages[0]!;

    expect(() =>
      translateOperations(
        [
          {
            op: "create",
            id: "nav-link",
            pageId: page.id,
            parentId: page.root.id,
            componentType: "Link",
            props: { text: "About", linkType: "page", pageId: "missing-page" },
          },
        ],
        document,
        registry,
      ),
    ).toThrow('Page "missing-page" does not exist');
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
