/**
 * Applies AI-generated commands through EditorSession (ADR-006).
 *
 * Validates each command against the current document before building a
 * composite, so partial failures are reported without leaving the document
 * half-mutated (Composite rolls back on partial failure — ADR-009).
 */

import { createCompositeCommand } from "../history/composite";
import { createCommandEngine } from "../history/commands";
import type { EditorSession } from "../history/session";
import type { Command, CommandError } from "../history/types";
import type { AIGenerateResult } from "./types";

function flattenCommands(commands: readonly Command[]): Command[] {
  const flat: Command[] = [];
  for (const command of commands) {
    if (command.type === "Composite") {
      flat.push(...command.payload.commands);
    } else {
      flat.push(command);
    }
  }
  return flat;
}

function partitionCommands(
  document: ReturnType<EditorSession["getDocument"]>,
  commands: readonly Command[],
): { valid: Command[]; failed: CommandError[] } {
  const engine = createCommandEngine();
  let simulated = document;
  const valid: Command[] = [];
  const failed: CommandError[] = [];

  for (const command of commands) {
    const result = engine.apply(simulated, command);
    if (result.ok) {
      valid.push(command);
      simulated = result.result.document;
    } else {
      failed.push(result.error);
    }
  }

  return { valid, failed };
}

export function applyAIResult(
  session: EditorSession,
  result: AIGenerateResult,
): { applied: number; failed: readonly CommandError[] } {
  const flat = flattenCommands(result.commands);
  if (flat.length === 0) {
    return { applied: 0, failed: [] };
  }

  const { valid, failed } = partitionCommands(session.getDocument(), flat);
  if (valid.length === 0) {
    return { applied: 0, failed };
  }

  const composite = createCompositeCommand(valid);
  const applyResult = session.execute(composite);
  if (!applyResult.ok) {
    return {
      applied: 0,
      failed: [...failed, applyResult.error],
    };
  }

  return { applied: valid.length, failed };
}
