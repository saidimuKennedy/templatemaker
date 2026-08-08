import type { Command } from "./types";

/** Wraps commands as one History entry. A single command is returned as-is. */
export function createCompositeCommand(commands: readonly Command[]): Command {
  if (commands.length === 0) {
    throw new Error("Composite command requires at least one sub-command.");
  }
  if (commands.length === 1) {
    return commands[0]!;
  }
  return { type: "Composite", payload: { commands } };
}
