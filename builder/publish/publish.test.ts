import { describe, expect, it } from "vitest";
import type { BuilderDocument } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { registerBuiltInComponents } from "../components";
import { renderPreview, publish, renderEmbed, exportDocumentJson } from "./index";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

function makeDocument(rootType: string, childType?: string): BuilderDocument {
  return {
    id: "proj-smoke",
    name: "Smoke",
    meta: { schemaVersion: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    pages: [
      {
        id: "page-1",
        name: "Home",
        path: "/",
        root: {
          id: "root",
          type: rootType,
          props: {},
          styles: {},
          children: childType
            ? [{ id: "child-1", type: childType, props: { text: "Hello" }, styles: {}, children: [] }]
            : [],
        },
      },
    ],
  };
}

describe("publish engine", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  const badDocument = makeDocument("Page", "NotRegistered");
  const goodDocument = makeDocument("Page", "Text");

  it("publish fails for an unregistered component type and returns non-empty errors", () => {
    const failResult = publish(badDocument, registry);
    assert(failResult.ok === false, "publish returns ok: false for unregistered type");
    if (!failResult.ok) {
      assert(failResult.errors.length > 0, "publish returns non-empty errors array");
    }
  });

  it("publish succeeds for a valid document with a correct PublishRecord", () => {
    const successResult = publish(goodDocument, registry);
    assert(successResult.ok === true, "publish returns ok: true for valid document");
    if (successResult.ok) {
      assert(successResult.record.status === "published", "record.status is published");
      assert(successResult.record.projectId === "proj-smoke", "record.projectId matches document");
      assert(successResult.record.schemaVersion === 1, "record.schemaVersion matches document meta");
      assert(successResult.record.publishedAt !== null, "record.publishedAt is set");
      assert(successResult.output !== undefined, "publish returns rendered output");
    }
  });

  it("renderPreview throws for an unregistered component type (no pre-validation)", () => {
    let previewThrew = false;
    try {
      renderPreview(badDocument, registry);
    } catch (error) {
      previewThrew = true;
      assert(
        error instanceof Error && error.message.includes("Unknown component type"),
        "renderPreview throws with unknown component message",
      );
    }
    assert(previewThrew, "renderPreview throws for unregistered component type");
  });

  it("renderEmbed validates like publish and accepts currentStatus passthrough", () => {
    const embedFail = renderEmbed(badDocument, registry);
    assert(embedFail.ok === false, "renderEmbed returns ok: false for unregistered type");

    const embedSuccess = renderEmbed(goodDocument, registry);
    assert(embedSuccess.ok === true, "renderEmbed succeeds for valid document");
    if (embedSuccess.ok) {
      assert(embedSuccess.record.status === "draft", "embed defaults record.status to draft");
    }

    const embedPublished = renderEmbed(goodDocument, registry, undefined, "published");
    assert(embedPublished.ok === true, "renderEmbed accepts currentStatus");
    if (embedPublished.ok) {
      assert(embedPublished.record.status === "published", "embed passes through currentStatus");
    }
  });

  it("exportDocumentJson serializes the document", () => {
    const json = exportDocumentJson(goodDocument);
    assert(json.includes('"proj-smoke"'), "exportDocumentJson serializes document id");
  });
});
