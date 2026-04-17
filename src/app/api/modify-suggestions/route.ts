import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { jsonError } from "@/lib/json";
import type { GenUISchema } from "@/types/schema";

const SYSTEM_PROMPT = `You propose short, concrete modification ideas for an existing AutoBrain tool. The user will see these as quick-action chips under a "Modify this tool" input.

Rules:
- Suggest 4 modifications, each is a short imperative sentence (max ~10 words).
- Ideas should be grounded in the given schema: adding/removing/renaming a specific input or output, switching or tuning the chart, tweaking a formula, adding a conditional input, changing layout. Do NOT propose totally unrelated tools.
- Do NOT duplicate existing inputs/outputs. Avoid generic filler like "Improve UX".
- Return ONLY a JSON object: { "suggestions": ["...", "...", "...", "..."] }.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError(500, "OPENAI_API_KEY is not set");
  }

  let body: { schema?: GenUISchema };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const schema = body.schema;
  if (!schema || typeof schema !== "object" || !schema.title) {
    return jsonError(400, "Missing schema");
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
      return jsonError(502, "Empty response from OpenAI");
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
    return jsonError(500, "Suggestion failed");
  }
}
