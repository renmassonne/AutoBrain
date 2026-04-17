import { NextRequest } from "next/server";
import type { GenUISchema } from "@/types/schema";
import {
  buildGenerationChatMessages,
  consumeChatCompletionStream,
} from "@/lib/generateSchema";
import { openai } from "@/lib/openai";
import { jsonErrorResponse, requestId } from "@/lib/json";

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonErrorResponse(500, "OPENAI_API_KEY is not set");
  }

  let body: { prompt: string; modify?: boolean; currentSchema?: GenUISchema };
  try {
    body = await request.json();
  } catch {
    return jsonErrorResponse(400, "Invalid JSON body");
  }

  const { prompt, modify, currentSchema } = body;
  if (!prompt || typeof prompt !== "string") {
    return jsonErrorResponse(400, "Missing prompt");
  }

  const rid = requestId();
  const { messages } = buildGenerationChatMessages({
    prompt,
    modify,
    currentSchema,
  });

  let stream: AsyncIterable<{
    choices: { delta?: { content?: string | null } }[];
  }>;
  try {
    stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages,
      temperature: 0.3,
      stream: true,
    });
  } catch (e) {
    console.error("[generate-stream] OpenAI error:", rid, e);
    return jsonErrorResponse(500, "Generation failed");
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
        );
      };

      try {
        for await (const payload of consumeChatCompletionStream(stream, rid)) {
          send(payload);
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        console.error("[generate-stream] iterator error:", e);
        send({ error: "Stream failed", requestId: rid });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
}
