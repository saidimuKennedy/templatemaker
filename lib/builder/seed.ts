import { generateNodeId, generatePageId } from "@/builder/document/id";
import type { BuilderNode, BuilderProject } from "@/builder/document/types";

const EMPTY_PROFILE = {
  name: "",
  tagline: "",
  bio: "",
  location: "",
};

const EMPTY_LINKS = {
  github: "",
  linkedin: "",
  twitter: "",
  website: "",
  email: "",
};

function createNode(
  type: string,
  props: Record<string, unknown>,
  children: BuilderNode[] = [],
): BuilderNode {
  return {
    id: generateNodeId(),
    type,
    props,
    styles: {},
    children,
  };
}

export function createDefaultDocument(templateId: string, projectId: string): BuilderProject {
  const isMinimal = templateId === "minimal";
  const sectionPadding = isMinimal ? "sm" : "md";
  const projectsStackDirection = isMinimal ? "column" : "row";
  const skillsStackDirection = "column";
  const now = new Date().toISOString();

  const root = createNode("Page", {}, [
    createNode("Section", { padding: sectionPadding }, [
      createNode("ProfileHeader", { ...EMPTY_PROFILE }),
    ]),
    createNode("Section", { padding: sectionPadding }, [
      createNode("Stack", { direction: projectsStackDirection }, []),
    ]),
    createNode("Section", { padding: sectionPadding }, [
      createNode("Stack", { direction: skillsStackDirection }, []),
    ]),
    createNode("Section", { padding: sectionPadding }, [
      createNode("LinksList", { ...EMPTY_LINKS }),
    ]),
  ]);

  return {
    id: projectId,
    name: "Untitled Portfolio",
    meta: {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
    pages: [
      {
        id: generatePageId(),
        name: "Home",
        path: "/",
        root,
      },
    ],
  };
}
