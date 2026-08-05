/**
 * Ad-hoc smoke checks for Plan 08 Document Adapter & Seed Templates.
 * Run: npx tsx lib/builder/smoke.ts
 */

import { serializeDocument } from "@/builder/document/serialize";
import {
  createDefaultDocument,
  createPortfolioRegistry,
  parseBuilderContent,
  validatePortfolioDocument,
} from "./index";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function findStackDirections(document: ReturnType<typeof createDefaultDocument>): string[] {
  const page = document.pages[0];
  const sections = page.root.children.filter((node) => node.type === "Section");
  return sections
    .map((section) => section.children.find((child) => child.type === "Stack"))
    .filter((stack): stack is NonNullable<typeof stack> => stack !== undefined)
    .map((stack) => String(stack.props.direction ?? "column"));
}

function findSectionPadding(document: ReturnType<typeof createDefaultDocument>): string[] {
  const page = document.pages[0];
  return page.root.children
    .filter((node) => node.type === "Section")
    .map((section) => String(section.props.padding ?? "md"));
}

const registry = createPortfolioRegistry();

for (const templateId of ["executive", "minimal"] as const) {
  const document = createDefaultDocument(templateId, "proj-1");
  const result = validatePortfolioDocument(document, registry);
  assert(result.valid, `${templateId} seed should validate: ${result.errors.map((e) => e.message).join(", ")}`);
  assert(document.id === "proj-1", `${templateId} seed uses caller project id`);
  assert(document.pages.length === 1, `${templateId} seed has one page`);
  assert(document.pages[0].root.type === "Page", `${templateId} root is Page`);

  const sectionCount = document.pages[0].root.children.filter((n) => n.type === "Section").length;
  assert(sectionCount === 4, `${templateId} seed has four sections`);
}

const executive = createDefaultDocument("executive", "proj-executive");
const minimal = createDefaultDocument("minimal", "proj-minimal");

assert(findStackDirections(executive).join(",") === "row,column", "executive projects stack is row");
assert(findStackDirections(minimal).join(",") === "column,column", "minimal stacks are column");
assert(findSectionPadding(executive).every((p) => p === "md"), "executive sections use md padding");
assert(findSectionPadding(minimal).every((p) => p === "sm"), "minimal sections use sm padding");

console.log("createDefaultDocument smoke: OK");

const seed = createDefaultDocument("executive", "proj-roundtrip");
const roundTripped = parseBuilderContent(JSON.parse(serializeDocument(seed)));
assert(roundTripped !== undefined, "round-trip parse succeeds");
assert(JSON.stringify(roundTripped) === JSON.stringify(seed), "round-trip document unchanged");

console.log("serializeDocument → parseBuilderContent round-trip: OK");

for (const invalid of [{}, null, "not-json"] as const) {
  assert(parseBuilderContent(invalid) === undefined, `parseBuilderContent returns undefined for ${String(invalid)}`);
}

console.log("parseBuilderContent invalid input: OK");
console.log("All Plan 08 smoke checks passed.");
