import type { BuilderDocument } from "../document/types";
import { createCommandEngine } from "./commands";
import { BuilderHistory } from "./history";
import type { Command, CommandApplyResult, CommandEngine, History } from "./types";

export interface EditorSession {
  getDocument(): BuilderDocument;
  execute(command: Command): CommandApplyResult;
  undo(): BuilderDocument | undefined;
  redo(): BuilderDocument | undefined;
  readonly history: History;
}

export function createEditorSession(
  initialDocument: BuilderDocument,
  commandEngine: CommandEngine = createCommandEngine(),
  history: BuilderHistory = new BuilderHistory(),
): EditorSession {
  let document = initialDocument;

  return {
    getDocument() {
      return document;
    },

    execute(command: Command): CommandApplyResult {
      const result = commandEngine.apply(document, command);
      if (result.ok) {
        // invert() reads pre-apply node state (parent/index/prior prop values),
        // so it must run against the same `document` apply() just succeeded against.
        const inverse = commandEngine.invert(document, command);
        document = result.result.document;
        history.push(command, inverse);
      }
      return result;
    },

    undo(): BuilderDocument | undefined {
      const inverseCommand = history.undo();
      if (!inverseCommand) return undefined;

      const result = commandEngine.apply(document, inverseCommand);
      if (!result.ok) {
        throw new Error(`Undo failed: ${result.error.message}`);
      }
      document = result.result.document;
      return document;
    },

    redo(): BuilderDocument | undefined {
      const command = history.redo();
      if (!command) return undefined;

      const result = commandEngine.apply(document, command);
      if (!result.ok) {
        throw new Error(`Redo failed: ${result.error.message}`);
      }
      document = result.result.document;
      return document;
    },

    history,
  };
}
