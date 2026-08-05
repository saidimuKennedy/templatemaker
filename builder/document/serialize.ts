/**
 * Document serialization (docs/03-document-model.md: "Nodes are
 * serializable"). Deserializing always runs structural validation so a
 * corrupt or hand-edited document can never enter the engine silently.
 */

import type { BuilderDocument, ValidationError } from "./types";
import { validateDocumentStructure } from "./validate";

export class DocumentParseError extends Error {
  constructor(message: string, readonly errors: readonly ValidationError[] = []) {
    super(message);
    this.name = "DocumentParseError";
  }
}

export function serializeDocument(document: BuilderDocument): string {
  return JSON.stringify(document);
}

export function deserializeDocument(json: string): BuilderDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new DocumentParseError(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const document = parsed as BuilderDocument;
  const result = validateDocumentStructure(document);
  if (!result.valid) {
    throw new DocumentParseError("Document failed structural validation.", result.errors);
  }
  return document;
}
