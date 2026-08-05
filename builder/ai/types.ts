/**
 * AIProvider contract (ADR-005, ADR-006).
 *
 * The engine never depends on a specific AI vendor. AI capabilities are
 * consumed only through this abstraction, and an AIProvider only ever
 * produces Commands against a BuilderDocument — never HTML, JSX, or
 * other rendered output. This makes AI just another client of the
 * Command API: its edits get validation, undo/redo, and rendering for
 * free.
 */

import type { BuilderDocument } from "../document/types";
import type { Command } from "../history/types";

export interface AIGenerateRequest {
  readonly prompt: string;
  /** The document being edited, for context. Providers must not mutate it. */
  readonly document: BuilderDocument;
}

/**
 * A provider proposes commands; it never applies them. The caller runs
 * them through the same CommandEngine used by the canvas and any other
 * client, so AI edits are indistinguishable from human edits once
 * applied.
 */
export interface AIGenerateResult {
  readonly commands: readonly Command[];
}

export interface AIProvider {
  readonly name: string;
  generate(request: AIGenerateRequest): Promise<AIGenerateResult>;
}
