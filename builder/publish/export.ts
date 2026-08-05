import type { BuilderDocument } from "../document/types";
import { serializeDocument } from "../document/serialize";

export function exportDocumentJson(document: BuilderDocument): string {
  return serializeDocument(document);
}
