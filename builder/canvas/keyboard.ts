export type CanvasKeyAction = "delete" | "duplicate" | "undo" | "redo" | "deselect";

export interface CanvasKeyEvent {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
}

export function resolveKeyAction(event: CanvasKeyEvent): CanvasKeyAction | undefined {
  const mod = event.metaKey || event.ctrlKey;
  const key = event.key;

  if (key === "Escape") {
    return "deselect";
  }

  if (key === "Delete" || key === "Backspace") {
    return "delete";
  }

  if (mod && key.toLowerCase() === "d") {
    return "duplicate";
  }

  if (mod && event.shiftKey && key.toLowerCase() === "z") {
    return "redo";
  }

  if (mod && !event.shiftKey && key.toLowerCase() === "z") {
    return "undo";
  }

  if (mod && key.toLowerCase() === "y") {
    return "redo";
  }

  return undefined;
}
