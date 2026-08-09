import type { BuilderDocument } from "../document/types";
import { validateAgainstRegistry, validateDocumentStructure } from "../document/validate";
import type { ComponentRegistry } from "../registry/types";
import { createRenderer } from "../renderer/renderer";
import type { Renderer } from "../renderer/types";
import type { PublishOutcome } from "./types";

export function publish(
  document: BuilderDocument,
  registry: ComponentRegistry,
  renderer: Renderer = createRenderer(),
): PublishOutcome {
  const structureResult = validateDocumentStructure(document);
  const registryResult = validateAgainstRegistry(document, registry);

  if (!structureResult.valid || !registryResult.valid) {
    return {
      ok: false,
      errors: [...structureResult.errors, ...registryResult.errors],
    };
  }

  const output = renderer.renderDocument(document, {
    registry,
    target: "published-webview",
    pages: document.pages,
  });

  return {
    ok: true,
    record: {
      projectId: document.id,
      status: "published",
      publishedAt: new Date().toISOString(),
      schemaVersion: document.meta.schemaVersion,
    },
    output,
  };
}
