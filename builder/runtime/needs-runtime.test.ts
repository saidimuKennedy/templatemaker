import { describe, expect, it } from "vitest";
import { pageNeedsRuntime } from "./needs-runtime";
import { createDefaultDocument } from "@/lib/builder/seed";
import { createPortfolioRegistry } from "@/lib/builder";

describe("pageNeedsRuntime", () => {
  const registry = createPortfolioRegistry();

  it("returns false for every seed template", () => {
    for (const templateId of ["executive", "minimal"] as const) {
      const document = createDefaultDocument(templateId, `proj-${templateId}`);
      const page = document.pages[0]!;
      expect(pageNeedsRuntime(page, registry)).toBe(false);
    }
  });

  it("returns true when a node has events", () => {
    const document = createDefaultDocument("executive", "proj-runtime");
    const page = document.pages[0]!;
    const root = {
      ...page.root,
      children: [
        ...page.root.children,
        {
          id: "btn-1",
          type: "Button",
          props: { label: "Click" },
          styles: {},
          children: [],
          events: {
            onClick: [{ type: "notify" as const, level: "success" as const, message: "Hi" }],
          },
        },
      ],
    };
    expect(pageNeedsRuntime({ ...page, root }, registry)).toBe(true);
  });

  it("returns true when props contain a binding", () => {
    const document = createDefaultDocument("minimal", "proj-bind");
    const page = document.pages[0]!;
    const textNode = page.root.children[0]!.children[0]!;
    const root = {
      ...page.root,
      children: page.root.children.map((section, index) =>
        index === 0
          ? {
              ...section,
              children: section.children.map((child) =>
                child.id === textNode.id
                  ? {
                      ...child,
                      props: { ...child.props, text: { $bind: "vars.greeting", fallback: "Hi" } },
                    }
                  : child,
              ),
            }
          : section,
      ),
    };
    expect(pageNeedsRuntime({ ...page, root }, registry)).toBe(true);
  });
});
