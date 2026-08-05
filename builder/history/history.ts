import type { Command, History } from "./types";

interface HistoryEntry {
  readonly command: Command;
  readonly inverse: Command;
}

export class BuilderHistory implements History {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];

  push(command: Command, inverse?: Command): void {
    // Only session.ts drives this class and always supplies both commands.
    if (inverse === undefined) {
      throw new Error("BuilderHistory.push requires an inverse command.");
    }
    this.undoStack.push({ command, inverse });
    this.redoStack.length = 0;
  }

  undo(): Command | undefined {
    const entry = this.undoStack.pop();
    if (!entry) return undefined;
    this.redoStack.push(entry);
    return entry.inverse;
  }

  redo(): Command | undefined {
    const entry = this.redoStack.pop();
    if (!entry) return undefined;
    this.undoStack.push(entry);
    return entry.command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

export function createHistory(): History {
  return new BuilderHistory();
}
