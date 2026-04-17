import type { GenUISchema } from "@/types/schema";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairMessages,
} from "@/lib/genPrompt";
import { validateGenUISchema } from "@/lib/validateSchema";
import { openai } from "@/lib/openai";
import { stripCodeBlock, requestId } from "@/lib/json";

/** SSE payloads for /api/generate-stream (matches existing client contract). */
export type GenerateStreamSsePayload =
  | { text: string }
  | { repairing: true; reason: string; errorCount: number }
  | { schema: GenUISchema; requestId: string; repaired?: boolean }
  | { error: string; requestId: string; errors?: string[] };

export type GenerateSchemaOnceResult =
  | { ok: true; schema: GenUISchema; repaired: boolean; requestId: string }
  | {
      ok: false;
      error: string;
      errors?: string[];
      requestId: string;
      status: number;
    };

export async function generateSchemaOnce(params: {
  prompt: string;
  modify?: boolean;
  currentSchema?: GenUISchema;
}): Promise<GenerateSchemaOnceResult> {
  const rid = requestId();
  const systemContent = buildSystemPrompt(
    Boolean(params.modify && params.currentSchema)
  );
  const userContent = buildUserPrompt({
    prompt: params.prompt,
    modify: params.modify,
    currentSchema: params.currentSchema,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return {
        ok: false,
        error: "Empty response from OpenAI",
        requestId: rid,
        status: 502,
      };
    }

    const raw1 = stripCodeBlock(content);
    let parsed1: unknown;
    try {
      parsed1 = JSON.parse(raw1);
    } catch {
      return {
        ok: false,
        error: "AI returned invalid JSON",
        requestId: rid,
        status: 502,
      };
    }

    const first = validateGenUISchema(parsed1);
    if (first.ok) {
      return { ok: true, schema: first.schema, repaired: false, requestId: rid };
    }

    const repair = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: buildRepairMessages(raw1, first.errors),
      temperature: 0.1,
    });
    const repairContent = repair.choices[0]?.message?.content?.trim() ?? "";
    if (!repairContent) {
      return {
        ok: false,
        error: `Schema validation failed: ${first.errors[0]}`,
        errors: first.errors,
        requestId: rid,
        status: 502,
      };
    }

    const raw2 = stripCodeBlock(repairContent);
    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(raw2);
    } catch {
      return {
        ok: false,
        error: `Schema validation failed after repair: ${first.errors[0]}`,
        errors: first.errors,
        requestId: rid,
        status: 502,
      };
    }

    const second = validateGenUISchema(parsed2);
    if (second.ok) {
      return { ok: true, schema: second.schema, repaired: true, requestId: rid };
    }

    return {
      ok: false,
      error: `Schema validation failed: ${second.errors[0]}`,
      errors: second.errors,
      requestId: rid,
      status: 502,
    };
  } catch (e) {
    console.error("[generate] OpenAI error:", rid, e);
    return {
      ok: false,
      error: "Generation failed",
      requestId: rid,
      status: 500,
    };
  }
}

export function buildGenerationChatMessages(params: {
  prompt: string;
  modify?: boolean;
  currentSchema?: GenUISchema;
}): { messages: { role: "system" | "user"; content: string }[] } {
  const systemContent = buildSystemPrompt(
    Boolean(params.modify && params.currentSchema)
  );
  const userContent = buildUserPrompt({
    prompt: params.prompt,
    modify: params.modify,
    currentSchema: params.currentSchema,
  });
  return {
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
  };
}

type ChatStreamChunk = {
  choices: { delta?: { content?: string | null } }[];
};

/**
 * Consumes an OpenAI streaming completion: yields `{ text: delta }`, then
 * terminal `{ schema, requestId }` or `{ error, requestId }` (+ repair path).
 * Caller must obtain `stream` via `openai.chat.completions.create({ stream: true })`
 * in an outer try/catch so pre-stream failures return JSON (not SSE).
 */
export async function* consumeChatCompletionStream(
  stream: AsyncIterable<ChatStreamChunk>,
  rid: string
): AsyncGenerator<GenerateStreamSsePayload> {
  let accumulated = "";
  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        accumulated += delta;
        yield { text: delta };
      }
    }

    const raw1 = stripCodeBlock(accumulated.trim());
    let parsed1: unknown;
    try {
      parsed1 = JSON.parse(raw1);
    } catch {
      yield { error: "AI returned invalid JSON", requestId: rid };
      return;
    }

    const first = validateGenUISchema(parsed1);
    if (first.ok) {
      yield { schema: first.schema, requestId: rid };
      return;
    }

    yield {
      repairing: true,
      reason: first.errors[0],
      errorCount: first.errors.length,
    };

    try {
      const repair = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: buildRepairMessages(raw1, first.errors),
        temperature: 0.1,
      });
      const repairContent =
        repair.choices[0]?.message?.content?.trim() ?? "";
      if (!repairContent) {
        yield {
          error: `Schema validation failed: ${first.errors[0]}`,
          errors: first.errors,
          requestId: rid,
        };
        return;
      }
      const raw2 = stripCodeBlock(repairContent);
      let parsed2: unknown;
      try {
        parsed2 = JSON.parse(raw2);
      } catch {
        yield {
          error: `Schema validation failed after repair: ${first.errors[0]}`,
          errors: first.errors,
          requestId: rid,
        };
        return;
      }
      const second = validateGenUISchema(parsed2);
      if (second.ok) {
        yield { schema: second.schema, repaired: true, requestId: rid };
      } else {
        yield {
          error: `Schema validation failed: ${second.errors[0]}`,
          errors: second.errors,
          requestId: rid,
        };
      }
    } catch (err) {
      console.error("[generate-stream] repair error:", rid, err);
      yield {
        error: `Schema validation failed: ${first.errors[0]}`,
        errors: first.errors,
        requestId: rid,
      };
    }
  } catch (err) {
    console.error("[generate-stream] stream error:", rid, err);
    yield { error: "Stream failed", requestId: rid };
  }
}

