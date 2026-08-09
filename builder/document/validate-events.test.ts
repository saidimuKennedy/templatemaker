import { describe, expect, it } from "vitest";
import { generateNodeId } from "../document/id";
import type { BuilderNode } from "./types";
import { validateDocumentEvents } from "./validate-events";
import { createDefaultDocument } from "@/lib/builder/seed";
import { createPortfolioRegistry } from "@/lib/builder";

describe("validateDocumentEvents", () => {
  const registry = createPortfolioRegistry();

  it("accepts valid notify action on a node", () => {
    const document = createDefaultDocument("executive", "proj-events");
    const page = document.pages[0]!;
    const buttonId = generateNodeId();
    const root = {
      ...page.root,
      children: [
        ...page.root.children,
        {
          id: buttonId,
          type: "Button",
          props: { label: "Go" },
          styles: {},
          children: [],
          events: {
            onClick: [{ type: "notify" as const, level: "success" as const, message: "It works" }],
          },
        },
      ],
    };
    const project = {
      ...document,
      pages: [{ ...page, root }],
    };
    const structure = validateDocumentEvents(project);
    expect(structure.valid).toBe(true);
    expect(registry.has("Button")).toBe(true);
  });

  it("rejects unknown event names and step types", () => {
    const document = createDefaultDocument("executive", "proj-bad-events");
    const page = document.pages[0]!;
    const nodeId = generateNodeId();

    const badEventResult = validateDocumentEvents({
      ...document,
      pages: [
        {
          ...page,
          root: {
            ...page.root,
            children: [
              {
                id: nodeId,
                type: "Button",
                props: {},
                styles: {},
                children: [],
                // Deliberately invalid: the validator, not the type system, is
                // what must reject an unknown event name at runtime.
                events: {
                  onHover: [{ type: "notify", level: "success", message: "nope" }],
                } as unknown as BuilderNode["events"],
              },
            ],
          },
        },
      ],
    });
    expect(badEventResult.valid).toBe(false);
    expect(badEventResult.errors.some((e) => e.message.includes("Unknown event"))).toBe(true);

    const badStepResult = validateDocumentEvents({
      ...document,
      pages: [
        {
          ...page,
          root: {
            ...page.root,
            children: [
              {
                id: nodeId,
                type: "Button",
                props: {},
                styles: {},
                children: [],
                // Deliberately invalid step type — see note above.
                events: {
                  onClick: [{ type: "flyAway", message: "nope" }],
                } as unknown as BuilderNode["events"],
              },
            ],
          },
        },
      ],
    });
    expect(badStepResult.valid).toBe(false);
    expect(badStepResult.errors.some((e) => e.message.includes("Unknown action step"))).toBe(true);
  });

  it("rejects dangling modal node ids and invalid binding paths", () => {
    const document = createDefaultDocument("executive", "proj-modal");
    const page = document.pages[0]!;
    const nodeId = generateNodeId();
    const root = {
      ...page.root,
      children: [
        {
          id: nodeId,
          type: "Text",
          props: { text: { $bind: "vars.__proto__.x" } },
          styles: {},
          children: [],
          events: {
            onClick: [{ type: "openModal" as const, nodeId: "missing-modal" }],
          },
        },
      ],
    };
    const result = validateDocumentEvents({ ...document, pages: [{ ...page, root }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("unknown node id"))).toBe(true);
    expect(result.errors.some((e) => e.message.includes("Invalid binding path"))).toBe(true);
  });
});
