import { describe, expect, it } from "vitest";
import { generateNodeId, generatePageId } from "../document/id";
import { createDefaultDocument } from "@/lib/builder/seed";
import { createCommandEngine } from "./commands";
import { createCompositeCommand } from "./composite";
import { createEditorSession } from "./session";

describe("composite commands", () => {
  it("deletes multiple nodes as one undo step", () => {
    const document = createDefaultDocument("executive", "proj-composite");
    const page = document.pages[0]!;
    const parent = page.root.children[1]!;
    const childIds = parent.children.map((node) => node.id);
    expect(childIds.length).toBeGreaterThan(0);

    const session = createEditorSession(document);
    session.execute(
      createCompositeCommand(
        childIds.map((nodeId) => ({
          type: "DeleteNode" as const,
          payload: { pageId: page.id, nodeId },
        })),
      ),
    );

    expect(session.getDocument().pages[0]!.root.children[1]!.children).toHaveLength(0);
    expect(session.canUndo()).toBe(true);

    session.undo();
    expect(session.getDocument().pages[0]!.root.children[1]!.children).toHaveLength(childIds.length);
    expect(session.canUndo()).toBe(false);
  });

  it("rolls back partial composite failure", () => {
    const engine = createCommandEngine();
    const document = createDefaultDocument("executive", "proj-rollback");
    const page = document.pages[0]!;
    const validNodeId = page.root.children[1]!.children[0]?.id;
    expect(validNodeId).toBeDefined();

    const result = engine.apply(
      document,
      createCompositeCommand([
        { type: "DeleteNode", payload: { pageId: page.id, nodeId: validNodeId! } },
        { type: "DeleteNode", payload: { pageId: page.id, nodeId: "missing-node" } },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(
      page.root.children[1]!.children.some((node) => node.id === validNodeId),
    ).toBe(true);
  });
});

describe("page commands", () => {
  it("creates, renames, reorders, and deletes pages with undo", () => {
    const document = createDefaultDocument("executive", "proj-pages");
    const session = createEditorSession(document);
    const homeId = document.pages[0]!.id;

    const aboutPage = {
      id: generatePageId(),
      name: "About",
      path: "/about",
      root: {
        id: generateNodeId(),
        type: "Page",
        props: {},
        styles: {},
        children: [],
      },
    };

    session.execute({ type: "CreatePage", payload: { page: aboutPage } });
    expect(session.getDocument().pages).toHaveLength(2);

    session.execute({ type: "UpdatePage", payload: { pageId: aboutPage.id, name: "About Us" } });
    expect(session.getDocument().pages.find((page) => page.id === aboutPage.id)?.name).toBe("About Us");

    session.execute({ type: "ReorderPage", payload: { pageId: aboutPage.id, newIndex: 0 } });
    expect(session.getDocument().pages[0]?.id).toBe(aboutPage.id);

    session.execute({ type: "DeletePage", payload: { pageId: aboutPage.id } });
    expect(session.getDocument().pages).toHaveLength(1);

    session.undo();
    expect(session.getDocument().pages).toHaveLength(2);

    session.undo();
    expect(session.getDocument().pages[0]?.id).toBe(homeId);

    session.undo();
    expect(session.getDocument().pages.find((page) => page.id === aboutPage.id)?.name).toBe("About");

    session.undo();
    expect(session.getDocument().pages).toHaveLength(1);
  });

  it("rejects deleting the last page", () => {
    const document = createDefaultDocument("executive", "proj-last-page");
    const session = createEditorSession(document);
    const result = session.execute({
      type: "DeletePage",
      payload: { pageId: document.pages[0]!.id },
    });
    expect(result.ok).toBe(false);
  });
});

describe("EditorSession canUndo/canRedo", () => {
  it("reflects history stack state", () => {
    const document = createDefaultDocument("executive", "proj-history");
    const session = createEditorSession(document);
    expect(session.canUndo()).toBe(false);
    expect(session.canRedo()).toBe(false);

    session.execute({
      type: "RenameNode",
      payload: {
        pageId: document.pages[0]!.id,
        nodeId: document.pages[0]!.root.id,
        name: "Home",
      },
    });
    expect(session.canUndo()).toBe(true);
    expect(session.canRedo()).toBe(false);

    session.undo();
    expect(session.canUndo()).toBe(false);
    expect(session.canRedo()).toBe(true);
  });
});
