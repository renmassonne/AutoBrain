import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You rewrite a user's short or vague tool description into a stronger, more specific prompt that can drive a good calculator/tool schema.

Rules:
- Keep the user's INTENT. Do not invent a totally different tool.
- Add specificity: list the inputs with sensible types (number, slider with min/max, select options, checkbox), what should be calculated, and (if it adds value) what chart to show.
- Stay concise: 1-3 sentences, max ~60 words.
- Use plain second-person / imperative language (e.g. "Build a ... where I enter ...").
- Do NOT ask clarifying questions.
- Return ONLY a JSON object of the shape { "prompt": "..." } with no explanation.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 502 }
      );
    }
    const parsed = JSON.parse(content) as { prompt?: unknown };
    const refined =
      typeof parsed.prompt === "string" ? parsed.prompt.trim() : "";
    if (!refined) {
      return NextResponse.json(
        { error: "Model returned no prompt" },
        { status: 502 }
      );
    }
    return NextResponse.json({ prompt: refined });
  } catch (e) {
    console.error("[refine-prompt] error:", e);
    return NextResponse.json(
      { error: "Refinement failed" },
      { status: 500 }
    );
  }
}
