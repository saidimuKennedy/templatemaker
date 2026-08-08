/**
 * OpenAI-compatible provider adapter (ADR-005).
 *
 * The only file in builder/ai that imports a model SDK. Everything else
 * consumes the AIProvider interface.
 *
 * Why this shape rather than a per-vendor adapter: ADR-005 asks for
 * vendor neutrality, but an interface alone only gets you neutrality at
 * the *code* level — adding a vendor still means writing a new adapter.
 * Most inference APIs (DeepSeek, Groq, Together, Fireworks, OpenRouter,
 * Mistral, vLLM, Ollama, LM Studio) expose an OpenAI-compatible
 * endpoint, so a single adapter parameterised by baseURL + key + model
 * moves vendor choice into configuration. Switching providers is three
 * environment variables and no code.
 *
 * The trade-off, stated plainly: "OpenAI-compatible" is a spectrum.
 * Endpoints differ in how they implement structured output — native JSON
 * schema, JSON mode, or tool calling — and this feature depends on
 * `Output.object()` producing a schema-conforming object. A provider
 * that advertises compatibility but fakes structured output will fail at
 * `result.output`, which is why that path throws a specific error rather
 * than returning empty commands.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import type { ComponentRegistry } from "../registry/types";
import { buildAIPrompt } from "./prompt";
import { aiResponseSchema } from "./schema";
import { translateOperations } from "./translate";
import type { AIProvider, AIGenerateRequest, AIGenerateResult } from "./types";

export interface OpenAICompatibleProviderConfig {
  /** Base URL of the OpenAI-compatible endpoint, e.g. https://api.deepseek.com/v1 */
  readonly baseURL: string;
  readonly apiKey: string;
  readonly modelId: string;
  readonly registry: ComponentRegistry;
  readonly maxOutputTokens?: number;
  /** Shown in errors and logs so a failure names the endpoint it came from. */
  readonly name?: string;
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleProviderConfig,
): AIProvider {
  const {
    baseURL,
    apiKey,
    modelId,
    registry,
    maxOutputTokens = 4096,
    name = "openai-compatible",
  } = config;

  const client = createOpenAICompatible({ name, baseURL, apiKey });

  return {
    name,

    async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
      const { system, user } = buildAIPrompt(registry, request.document, request.prompt);

      const result = await generateText({
        model: client(modelId),
        system,
        prompt: user,
        maxOutputTokens,
        output: Output.object({
          schema: aiResponseSchema,
          name: "builder_commands",
          description: "Structured builder operations to modify a portfolio page",
        }),
      });

      if (!result.output) {
        throw new Error(
          `Model "${modelId}" at ${baseURL} did not return structured output. ` +
            "The endpoint may not support JSON-schema or tool-calling output.",
        );
      }

      return {
        commands: translateOperations(result.output.operations, request.document, registry),
      };
    },
  };
}
