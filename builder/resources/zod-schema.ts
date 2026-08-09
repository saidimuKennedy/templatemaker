import { z } from "zod";
import type { ResourceDefinition, ResourceField } from "./types";

function fieldZodSchema(field: ResourceField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "string":
    case "text":
      schema = z.string();
      break;
    case "email":
      schema = z.string().email();
      break;
    case "number":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    default:
      schema = z.unknown();
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/** Builds a Zod object schema from a resource definition for server-side validation. */
export function buildRecordZodSchema(definition: ResourceDefinition) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of definition.fields) {
    shape[field.name] = fieldZodSchema(field);
  }

  return z.object(shape).strict();
}

export type RecordPayload = Record<string, unknown>;
