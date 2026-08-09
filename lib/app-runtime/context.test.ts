import { describe, expect, it } from "vitest";
import { isHoneypotTriggered, stripHoneypotField } from "@/lib/app-runtime/context";
import type { ResourceDefinition } from "@/builder/resources/types";

describe("honeypot handling", () => {
  const definition: ResourceDefinition = {
    name: "messages",
    fields: [
      { name: "email", type: "email", required: true },
      { name: "website", type: "string", required: false },
    ],
    honeypot: "website",
  };

  it("detects filled honeypot fields", () => {
    expect(isHoneypotTriggered(definition, { email: "a@b.com", website: "spam" })).toBe(true);
    expect(isHoneypotTriggered(definition, { email: "a@b.com" })).toBe(false);
  });

  it("strips honeypot before validation", () => {
    expect(stripHoneypotField(definition, { email: "a@b.com", website: "" })).toEqual({
      email: "a@b.com",
    });
  });
});
