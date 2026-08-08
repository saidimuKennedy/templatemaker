import { describe, expect, it } from "vitest";
import { createComponentRegistry } from "../registry/registry";
import { registerBuiltInComponents } from "../components";
import { migrateDocumentLayoutIntent, seedLayoutStyles } from "./layout-intent";

describe("layout intent migration", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);

  it("moves Stack layout props into styles.base and strips props", () => {
    const seeded = seedLayoutStyles(
      {
        id: "stack-1",
        type: "Stack",
        props: { direction: "row", justify: "center", align: "center", wrap: "nowrap" },
        styles: {},
        children: [],
      },
      registry,
    );

    expect(seeded.props).toEqual({});
    expect(seeded.styles.base).toMatchObject({
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
    });
  });

  it("moves Grid columns into gridTemplateColumns", () => {
    const seeded = seedLayoutStyles(
      {
        id: "grid-1",
        type: "Grid",
        props: { columns: 3, gap: "lg" },
        styles: {},
        children: [],
      },
      registry,
    );

    expect(seeded.props).toEqual({});
    const base = seeded.styles.base as Record<string, string | number> | undefined;
    expect(base).toMatchObject({
      display: "grid",
      gap: "32px",
    });
    expect(String(base?.gridTemplateColumns)).toContain("auto-fit");
  });

  it("is idempotent across repeated migration", () => {
    const node = {
      id: "stack-2",
      type: "Stack",
      props: { direction: "column" },
      styles: {},
      children: [],
    } as const;

    const once = seedLayoutStyles(node, registry);
    const twice = seedLayoutStyles(once, registry);
    expect(twice).toEqual(once);
  });

  it("migrates an entire document tree", () => {
    const document = migrateDocumentLayoutIntent(
      {
        id: "p1",
        name: "Test",
        meta: { schemaVersion: 1, createdAt: "", updatedAt: "" },
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
                  id: "stack-1",
                  type: "Stack",
                  props: { direction: "row" },
                  styles: {},
                  children: [],
                },
              ],
            },
          },
        ],
      },
      registry,
    );

    const stack = document.pages[0]!.root.children[0]!;
    expect(stack.props).toEqual({});
    expect(stack.styles.base).toMatchObject({ flexDirection: "row" });
  });
});
