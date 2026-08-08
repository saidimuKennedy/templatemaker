import { describe, expect, it } from "vitest";
import { generateNodeId } from "../document/id";
import { createCommandEngine } from "../history/commands";
import { createEditorSession } from "../history/session";
import type { Command } from "../history/types";
import { applyAIResult } from "./apply";
import { createDefaultDocument } from "@/lib/builder/seed";

describe("applyAIResult", () => {
  it("applies valid commands as one composite undo step", () => {
    const document = createDefaultDocument("executive", "ai-apply-test");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const parentId = page.root.id;
    const nodeId = generateNodeId();

    const commands: Command[] = [
      {
        type: "CreateNode",
        payload: {
          pageId: page.id,
          parentId,
          node: {
            id: nodeId,
            type: "Section",
            props: { padding: "md" },
            styles: {},
            children: [],
          },
        },
      },
      {
        type: "CreateNode",
        payload: {
          pageId: page.id,
          parentId: nodeId,
          node: {
            id: generateNodeId(),
            type: "Heading",
            props: { text: "Hello", level: "h2" },
            styles: {},
            children: [],
          },
        },
      },
    ];

    const { applied, failed } = applyAIResult(session, { commands });
    expect(applied).toBe(2);
    expect(failed).toHaveLength(0);
    expect(session.canUndo()).toBe(true);

    session.undo();
    expect(session.getDocument().pages[0]!.root.children).toHaveLength(
      document.pages[0]!.root.children.length,
    );
  });

  it("reports invalid commands without throwing and applies valid ones", () => {
    const document = createDefaultDocument("executive", "ai-apply-partial");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const parentId = page.root.id;

    const validId = generateNodeId();
    const commands: Command[] = [
      {
        type: "CreateNode",
        payload: {
          pageId: page.id,
          parentId,
          node: {
            id: validId,
            type: "Text",
            props: { text: "Valid" },
            styles: {},
            children: [],
          },
        },
      },
      {
        type: "UpdateProps",
        payload: {
          pageId: page.id,
          nodeId: "missing-node-id",
          props: { text: "Nope" },
        },
      },
    ];

    const { applied, failed } = applyAIResult(session, { commands });
    expect(applied).toBe(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.message).toContain("missing-node-id");
    expect(
      session.getDocument().pages[0]!.root.children.some((node) => node.id === validId),
    ).toBe(true);
  });

  it("returns zero applied when every command fails validation", () => {
    const document = createDefaultDocument("executive", "ai-apply-all-bad");
    const session = createEditorSession(document);
    const page = document.pages[0]!;

    const { applied, failed } = applyAIResult(session, {
      commands: [
        {
          type: "DeleteNode",
          payload: { pageId: page.id, nodeId: "does-not-exist" },
        },
      ],
    });

    expect(applied).toBe(0);
    expect(failed).toHaveLength(1);
    expect(session.canUndo()).toBe(false);
  });

  it("does not mutate the document when composite apply would fail", () => {
    const engine = createCommandEngine();
    const document = createDefaultDocument("executive", "ai-apply-rollback");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const beforeJson = JSON.stringify(session.getDocument());

    applyAIResult(session, {
      commands: [
        {
          type: "DeleteNode",
          payload: { pageId: page.id, nodeId: "missing" },
        },
      ],
    });

    expect(JSON.stringify(session.getDocument())).toBe(beforeJson);
    expect(engine.apply(document, { type: "DeleteNode", payload: { pageId: page.id, nodeId: "missing" } }).ok).toBe(
      false,
    );
  });
});
