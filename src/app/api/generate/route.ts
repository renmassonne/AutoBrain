import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: { prompt: string; modify?: boolean; currentSchema?: GenUISchema };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, modify, currentSchema } = body;
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'prompt'" },
      { status: 400 }
    );
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const systemContent = buildSystemPrompt(Boolean(modify && currentSchema));
  const userContent = buildUserPrompt({ prompt, modify, currentSchema });

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
      return NextResponse.json(
        { error: "Empty response from OpenAI", requestId },
        { status: 502 }
      );
    }

    const raw1 = stripCodeBlock(content);
    let parsed1: unknown;
    try {
      parsed1 = JSON.parse(raw1);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", requestId },
        { status: 502 }
      );
    }

    const first = validateGenUISchema(parsed1);
    if (first.ok) {
      return NextResponse.json({ schema: first.schema, requestId });
    }

    // One-shot repair attempt.
    const repairMessages = buildRepairMessages(raw1, first.errors);
    const repair = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: repairMessages,
      temperature: 0.1,
    });
    const repairContent = repair.choices[0]?.message?.content?.trim() ?? "";
    if (!repairContent) {
      return NextResponse.json(
        {
          error: `Schema validation failed: ${first.errors[0]}`,
          errors: first.errors,
          requestId,
        },
        { status: 502 }
      );
    }

    const raw2 = stripCodeBlock(repairContent);
    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(raw2);
    } catch {
      return NextResponse.json(
        {
          error: `Schema validation failed after repair: ${first.errors[0]}`,
          errors: first.errors,
          requestId,
        },
        { status: 502 }
      );
    }

    const second = validateGenUISchema(parsed2);
    if (second.ok) {
      return NextResponse.json({ schema: second.schema, repaired: true, requestId });
    }

    return NextResponse.json(
      {
        error: `Schema validation failed: ${second.errors[0]}`,
        errors: second.errors,
        requestId,
      },
      { status: 502 }
    );
  } catch (e) {
    console.error("[generate] OpenAI error:", requestId, e);
    return NextResponse.json(
      { error: "Generation failed", requestId },
      { status: 500 }
    );
  }
}
