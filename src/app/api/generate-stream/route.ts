import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { GenUISchema } from "@/types/schema";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairMessages,
} from "@/lib/genPrompt";
import { validateGenUISchema } from "@/lib/validateSchema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripCodeBlock(s: string): string {
  const match = s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  return match ? match[1].trim() : s;
}

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError(500, "OPENAI_API_KEY is not set");
  }

  let body: { prompt: string; modify?: boolean; currentSchema?: GenUISchema };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const { prompt, modify, currentSchema } = body;
  if (!prompt || typeof prompt !== "string") {
    return jsonError(400, "Missing prompt");
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const systemContent = buildSystemPrompt(Boolean(modify && currentSchema));
  const userContent = buildUserPrompt({ prompt, modify, currentSchema });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
          );
        };

        let accumulated = "";

        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              send({ text: delta });
            }
          }

          const raw1 = stripCodeBlock(accumulated.trim());
          let parsed1: unknown;
          try {
            parsed1 = JSON.parse(raw1);
          } catch {
            send({ error: "AI returned invalid JSON", requestId });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          const first = validateGenUISchema(parsed1);
          if (first.ok) {
            send({ schema: first.schema, requestId });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          // Try a one-shot repair call (non-streaming to keep it simple).
          send({
            repairing: true,
            reason: first.errors[0],
            errorCount: first.errors.length,
          });

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
              send({
                error: `Schema validation failed: ${first.errors[0]}`,
                errors: first.errors,
                requestId,
              });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            const raw2 = stripCodeBlock(repairContent);
            let parsed2: unknown;
            try {
              parsed2 = JSON.parse(raw2);
            } catch {
              send({
                error: `Schema validation failed after repair: ${first.errors[0]}`,
                errors: first.errors,
                requestId,
              });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            const second = validateGenUISchema(parsed2);
            if (second.ok) {
              send({ schema: second.schema, repaired: true, requestId });
            } else {
              send({
                error: `Schema validation failed: ${second.errors[0]}`,
                errors: second.errors,
                requestId,
              });
            }
          } catch (err) {
            console.error("[generate-stream] repair error:", requestId, err);
            send({
              error: `Schema validation failed: ${first.errors[0]}`,
              errors: first.errors,
              requestId,
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[generate-stream] stream error:", requestId, err);
          send({ error: "Stream failed", requestId });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[generate-stream] OpenAI error:", requestId, e);
    return jsonError(500, "Generation failed");
  }
}
