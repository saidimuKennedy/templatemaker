import type { ReactElement } from "react";
import type { Prisma } from "@prisma/client";
import { findNodeAndParent } from "@/builder/document/tree";
import { deserializeDocument } from "@/builder/document/serialize";
import {
  validateAgainstRegistry,
  validateDocumentStructure,
} from "@/builder/document/validate";
import type { BuilderDocument, BuilderNode, ValidationResult } from "@/builder/document/types";
import type { ComponentRegistry } from "@/builder/registry/types";
import { createRenderer } from "@/builder/renderer/renderer";
import { createStyledRenderer } from "@/builder/styles/apply";

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

function walkForProfileHeader(node: BuilderNode): BuilderNode | undefined {
  if (node.type === "ProfileHeader") {
    return node;
  }
  for (const child of node.children) {
    const found = walkForProfileHeader(child);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function findProfileHeaderNode(document: BuilderDocument): BuilderNode | undefined {
  for (const page of document.pages) {
    const found = walkForProfileHeader(page.root);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function getProfileHeaderName(document: BuilderDocument): string {
  const node = findProfileHeaderNode(document);
  if (!node) {
    return "";
  }
  return typeof node.props.name === "string" ? node.props.name : "";
}

export function getProfileHeaderBio(document: BuilderDocument): string {
  const node = findProfileHeaderNode(document);
  if (!node) {
    return "";
  }
  return typeof node.props.bio === "string" ? node.props.bio : "";
}

export function renderPublished(
  document: BuilderDocument,
  registry: ComponentRegistry,
): ReactElement {
  const renderer = createStyledRenderer(createRenderer(), "base");
  return renderer.renderDocument(document, {
    registry,
    target: "published-webview",
  });
}

export function findNodeParentId(
  document: BuilderDocument,
  pageId: string,
  nodeId: string,
): string | undefined {
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return undefined;
  }
  const found = findNodeAndParent(page.root, nodeId);
  return found?.parent?.id;
}
