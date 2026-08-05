import type { Prisma } from "@prisma/client";
import { deserializeDocument } from "@/builder/document/serialize";
import {
  validateAgainstRegistry,
  validateDocumentStructure,
} from "@/builder/document/validate";
import type { BuilderDocument, ValidationResult } from "@/builder/document/types";
import type { ComponentRegistry } from "@/builder/registry/types";

export function parseBuilderContent(raw: Prisma.JsonValue): BuilderDocument | undefined {
  try {
    return deserializeDocument(JSON.stringify(raw));
  } catch {
    return undefined;
  }
}

export function validatePortfolioDocument(
  document: BuilderDocument,
  registry: ComponentRegistry,
): ValidationResult {
  const structure = validateDocumentStructure(document);
  const registryResult = validateAgainstRegistry(document, registry);

  return {
    valid: structure.valid && registryResult.valid,
    errors: [...structure.errors, ...registryResult.errors],
  };
}
