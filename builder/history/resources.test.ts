import { describe, expect, it } from "vitest";
import { createCommandEngine } from "@/builder/history/commands";
import type { BuilderDocument } from "@/builder/document/types";

const baseDocument: BuilderDocument = {
  id: "proj-1",
  name: "Test",
  meta: { schemaVersion: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  pages: [
    {
      id: "page-1",
      name: "Home",
      path: "/",
      root: {
        id: "root",
        type: "Stack",
        props: {},
        styles: {},
        children: [],
      },
    },
  ],
};

describe("resource commands", () => {
  const engine = createCommandEngine();

  it("upserts and deletes resources through the command engine", () => {
    const resource = {
      name: "messages",
      fields: [{ name: "email", type: "email" as const, required: true }],
    };

    const upsert = engine.apply(baseDocument, { type: "UpsertResource", payload: { resource } });
    expect(upsert.ok).toBe(true);
    if (!upsert.ok) {
      return;
    }
    expect(upsert.result.document.resources).toHaveLength(1);

    const del = engine.apply(upsert.result.document, {
      type: "DeleteResource",
      payload: { name: "messages" },
    });
    expect(del.ok).toBe(true);
    if (!del.ok) {
      return;
    }
    expect(del.result.document.resources).toBeUndefined();
  });
});
