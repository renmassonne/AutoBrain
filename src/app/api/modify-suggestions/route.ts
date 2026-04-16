import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { GenUISchema } from "@/types/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You propose short, concrete modification ideas for an existing AutoBrain tool. The user will see these as quick-action chips under a "Modify this tool" input.

Rules:
- Suggest 4 modifications, each is a short imperative sentence (max ~10 words).
- Ideas should be grounded in the given schema: adding/removing/renaming a specific input or output, switching or tuning the chart, tweaking a formula, adding a conditional input, changing layout. Do NOT propose totally unrelated tools.
- Do NOT duplicate existing inputs/outputs. Avoid generic filler like "Improve UX".
- Return ONLY a JSON object: { "suggestions": ["...", "...", "...", "..."] }.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: { schema?: GenUISchema };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const schema = body.schema;
  if (!schema || typeof schema !== "object" || !schema.title) {
    return NextResponse.json({ error: "Missing schema" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Current schema:\n${JSON.stringify(schema, null, 2)}\n\nPropose 4 short modification ideas.`,
        },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 502 }
      );
    }
    const parsed = JSON.parse(content) as { suggestions?: unknown };
    const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = list
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 4);
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[modify-suggestions] error:", e);
    return NextResponse.json(
      { error: "Suggestion failed" },
      { status: 500 }
    );
  }
}
