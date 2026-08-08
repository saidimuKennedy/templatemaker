/**
 * Intermediate schema for AI structured output.
 *
 * The full Command union (recursive BuilderNode trees) is awkward for LLM
 * structured output, so the model emits flat operations that translate.ts
 * maps to Commands.
 */

import { z } from "zod";
import { normalizeNodeStylesWithLogging } from "./normalize-styles";

const propsRecord = z.record(z.string(), z.unknown());

const styleDeclarationSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

const normalizedStylesSchema = z.preprocess(
  (value) => normalizeNodeStylesWithLogging(value),
  z
    .object({
      base: styleDeclarationSchema.optional(),
      sm: styleDeclarationSchema.optional(),
      md: styleDeclarationSchema.optional(),
      lg: styleDeclarationSchema.optional(),
    })
    .strict(),
);

export const aiCreateOperationSchema = z.object({
  op: z.literal("create"),
  id: z.string().min(1),
  pageId: z.string().min(1),
  parentId: z.string().min(1),
  componentType: z.string().min(1),
  props: propsRecord.optional(),
  styles: normalizedStylesSchema.optional(),
  name: z.string().optional(),
});

export const aiUpdatePropsOperationSchema = z.object({
  op: z.literal("updateProps"),
  pageId: z.string().min(1),
  nodeId: z.string().min(1),
  props: propsRecord,
});

export const aiUpdateStylesOperationSchema = z.object({
  op: z.literal("updateStyles"),
  pageId: z.string().min(1),
  nodeId: z.string().min(1),
  styles: normalizedStylesSchema,
});

export const aiMoveOperationSchema = z.object({
  op: z.literal("move"),
  pageId: z.string().min(1),
  nodeId: z.string().min(1),
  newParentId: z.string().min(1),
  newIndex: z.number().int().min(0),
});

export const aiDeleteOperationSchema = z.object({
  op: z.literal("delete"),
  pageId: z.string().min(1),
  nodeId: z.string().min(1),
});

export const aiRenameOperationSchema = z.object({
  op: z.literal("rename"),
  pageId: z.string().min(1),
  nodeId: z.string().min(1),
  name: z.string().optional(),
});

export const aiOperationSchema = z.discriminatedUnion("op", [
  aiCreateOperationSchema,
  aiUpdatePropsOperationSchema,
  aiUpdateStylesOperationSchema,
  aiMoveOperationSchema,
  aiDeleteOperationSchema,
  aiRenameOperationSchema,
]);

export type AIOperation = z.infer<typeof aiOperationSchema>;

export const aiResponseSchema = z.object({
  operations: z.array(aiOperationSchema),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;
