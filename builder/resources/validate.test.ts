import { describe, expect, it } from "vitest";
import { defaultPermissionsForResource } from "@/builder/resources/validate";
import { validateResources } from "@/builder/resources/validate";
import type { ResourceDefinition } from "@/builder/resources/types";

describe("validateResources", () => {
  const valid: ResourceDefinition = {
    name: "messages",
    fields: [{ name: "email", type: "email", required: true }],
    honeypot: "email",
  };

  it("accepts a well-formed resource", () => {
    expect(validateResources([valid]).valid).toBe(true);
  });

  it("rejects duplicate resource names", () => {
    const result = validateResources([valid, valid]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Duplicate resource"))).toBe(true);
  });

  it("rejects honeypot fields not in schema", () => {
    const result = validateResources([
      {
        name: "messages",
        fields: [{ name: "title", type: "string", required: true }],
        honeypot: "bot_trap",
      },
    ]);
    expect(result.valid).toBe(false);
  });

  it("defaults read permission to none when omitted", () => {
    const permissions = defaultPermissionsForResource({
      name: "messages",
      fields: [{ name: "email", type: "email", required: true }],
    });
    expect(permissions.read).toBe("none");
    expect(permissions.create).toBe("public");
  });
});
