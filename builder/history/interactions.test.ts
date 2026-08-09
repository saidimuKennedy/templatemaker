import { describe, expect, it } from "vitest";
import { generateNodeId } from "../document/id";
import { createDefaultDocument } from "@/lib/builder/seed";
import { createEditorSession } from "./session";
import { createSetNodeEventsCommand, createSetNodeEventOptionsCommand, createSetPropBindingCommand } from "../inspector/edit";

describe("interaction commands", () => {
  it("sets node events with undo/redo", () => {
    const document = createDefaultDocument("executive", "proj-interactions");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const nodeId = generateNodeId();
    session.execute({
      type: "CreateNode",
      payload: {
        pageId: page.id,
        parentId: page.root.id,
        node: {
          id: nodeId,
          type: "Button",
          props: { label: "Click me" },
          styles: {},
          children: [],
        },
      },
    });

    const steps = [{ type: "notify" as const, level: "success" as const, message: "It works" }];
    session.execute(createSetNodeEventsCommand(page.id, nodeId, { onClick: steps }));

    const node = session
      .getDocument()
      .pages[0]!.root.children.find((entry) => entry.id === nodeId);
    expect(node?.events?.onClick).toEqual(steps);

    session.undo();
    expect(
      session.getDocument().pages[0]!.root.children.find((entry) => entry.id === nodeId)?.events,
    ).toBeUndefined();

    session.redo();
    expect(
      session.getDocument().pages[0]!.root.children.find((entry) => entry.id === nodeId)?.events
        ?.onClick,
    ).toEqual(steps);
  });

  it("sets node event options with undo/redo", () => {
    const document = createDefaultDocument("executive", "proj-event-options");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const nodeId = generateNodeId();
    session.execute({
      type: "CreateNode",
      payload: {
        pageId: page.id,
        parentId: page.root.id,
        node: {
          id: nodeId,
          type: "Button",
          props: { label: "Click me" },
          styles: {},
          children: [],
        },
      },
    });

    session.execute(
      createSetNodeEventOptionsCommand(page.id, nodeId, {
        onClick: { enabled: false, throttleMs: 300 },
      }),
    );

    const node = session
      .getDocument()
      .pages[0]!.root.children.find((entry) => entry.id === nodeId);
    expect(node?.eventOptions?.onClick).toEqual({ enabled: false, throttleMs: 300 });

    session.undo();
    expect(
      session.getDocument().pages[0]!.root.children.find((entry) => entry.id === nodeId)?.eventOptions,
    ).toBeUndefined();
  });

  it("sets and clears prop bindings with undo", () => {
    const document = createDefaultDocument("executive", "proj-bindings");
    const session = createEditorSession(document);
    const page = document.pages[0]!;
    const textNode = page.root.children[0]!.children[0]!;

    session.execute(
      createSetPropBindingCommand(page.id, textNode.id, "text", "vars.greeting", "Hello"),
    );
    expect(session.getDocument().pages[0]!.root.children[0]!.children[0]!.props.text).toEqual({
      $bind: "vars.greeting",
      fallback: "Hello",
    });

    session.undo();
    expect(session.getDocument().pages[0]!.root.children[0]!.children[0]!.props.text).toBe(
      textNode.props.text,
    );
  });
});
