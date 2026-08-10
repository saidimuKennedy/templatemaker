import { describe, expect, it } from "vitest";
import { validateDocumentForms } from "./validate-forms";
import { createDefaultDocument } from "@/lib/builder/seed";
import { generateNodeId } from "./id";

describe("validateDocumentForms", () => {
  it("rejects a form field that does not exist on the resource", () => {
    const document = createDefaultDocument("executive", "proj-forms");
    const page = document.pages[0]!;
    const formId = generateNodeId();
    const inputId = generateNodeId();

    const result = validateDocumentForms({
      ...document,
      resources: [
        {
          name: "customers",
          fields: [{ name: "email", type: "email", required: true }],
        },
      ],
      pages: [
        {
          ...page,
          root: {
            ...page.root,
            children: [
              {
                id: formId,
                type: "Form",
                props: { resource: "customers" },
                styles: {},
                children: [
                  {
                    id: inputId,
                    type: "Input",
                    props: { field: "emial", label: "Email" },
                    styles: {},
                    children: [],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('"emial"'))).toBe(true);
  });

  it("rejects a form referencing a missing resource", () => {
    const document = createDefaultDocument("minimal", "proj-missing-resource");
    const page = document.pages[0]!;

    const result = validateDocumentForms({
      ...document,
      pages: [
        {
          ...page,
          root: {
            ...page.root,
            children: [
              {
                id: generateNodeId(),
                type: "Form",
                props: { resource: "missing" },
                styles: {},
                children: [],
              },
            ],
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("unknown resource"))).toBe(true);
  });
});
