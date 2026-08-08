import { describe, expect, it } from "vitest";
import type { BuilderDocument, BuilderNode } from "../document/types";
import { buildStyleDigest, formatStyleDigest } from "./style-digest";

function node(
  id: string,
  type: string,
  styles: BuilderNode["styles"],
  children: BuilderNode[] = [],
  name?: string,
): BuilderNode {
  return { id, type, props: {}, styles, children, ...(name ? { name } : {}) };
}

function doc(root: BuilderNode): BuilderDocument {
  return {
    id: "p1",
    name: "Test",
    meta: { schemaVersion: 1, createdAt: "", updatedAt: "" },
    pages: [{ id: "page-1", name: "Home", path: "/", root }],
  };
}

describe("style digest", () => {
  it("ranks values by how often the document uses them", () => {
    const digest = buildStyleDigest(
      doc(
        node("root", "Container", { base: { backgroundColor: "#ffffff" } }, [
          node("a", "Container", { base: { backgroundColor: "#f1f5f9", borderRadius: "16px" } }),
          node("b", "Container", { base: { backgroundColor: "#f1f5f9", borderRadius: "16px" } }),
          node("c", "Container", { base: { backgroundColor: "#f1f5f9", borderRadius: "24px" } }),
        ]),
      ),
    );

    // The value used three times is the design; the one-off is not.
    expect(digest.colors[0]).toBe("#f1f5f9");
    expect(digest.radii[0]).toBe("16px");
  });

  it("collects values authored at any breakpoint", () => {
    const digest = buildStyleDigest(
      doc(node("root", "Container", { lg: { borderRadius: "32px" } })),
    );
    expect(digest.radii).toContain("32px");
  });

  it("records existing section names so new sections fit the page", () => {
    const digest = buildStyleDigest(
      doc(
        node("root", "Page", {}, [
          node("s1", "Section", { base: { paddingTop: "48px" } }, [], "Section - Intro"),
        ]),
      ),
    );
    expect(digest.sectionNames).toContain("Section - Intro");
  });

  it("reports an empty document as empty and formats to null", () => {
    const digest = buildStyleDigest(doc(node("root", "Page", {})));
    expect(digest.isEmpty).toBe(true);
    // The prompt omits the whole section rather than printing a hollow
    // heading the model has to reason about.
    expect(formatStyleDigest(digest)).toBeNull();
  });

  it("orders ties deterministically so the prompt is stable across runs", () => {
    const build = () =>
      buildStyleDigest(
        doc(
          node("root", "Container", {}, [
            node("a", "Container", { base: { borderRadius: "8px" } }),
            node("b", "Container", { base: { borderRadius: "12px" } }),
          ]),
        ),
      );
    expect(build().radii).toEqual(build().radii);
  });
});
