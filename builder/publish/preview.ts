import type { ReactElement } from "react";
import type { BuilderDocument } from "../document/types";
import type { ComponentRegistry } from "../registry/types";
import { createRenderer } from "../renderer/renderer";
import type { Renderer } from "../renderer/types";

export function renderPreview(
  document: BuilderDocument,
  registry: ComponentRegistry,
  renderer: Renderer = createRenderer(),
): ReactElement {
  return renderer.renderDocument(document, {
    registry,
    target: "editor-preview",
  });
}
