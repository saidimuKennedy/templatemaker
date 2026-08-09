import { describe, expect, it } from "vitest";
import { buildRecordZodSchema } from "@/builder/resources/zod-schema";
import type { ResourceDefinition } from "@/builder/resources/types";

describe("buildRecordZodSchema", () => {
  const definition: ResourceDefinition = {
    name: "messages",
    fields: [
      { name: "email", type: "email", required: true },
      { name: "note", type: "text", required: false },
    ],
  };

  it("validates required fields", () => {
    const schema = buildRecordZodSchema(definition);
    expect(schema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const schema = buildRecordZodSchema(definition);
    expect(schema.safeParse({ email: "a@b.com", extra: "x" }).success).toBe(false);
  });
});
