import { NextRequest, NextResponse } from "next/server";
import type { GenUISchema } from "@/types/schema";
import { generateSchemaOnce } from "@/lib/generateSchema";
import { jsonError } from "@/lib/json";

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
    return jsonError(400, "Missing or invalid 'prompt'");
  }

  const result = await generateSchemaOnce({ prompt, modify, currentSchema });
  if (result.ok) {
    return NextResponse.json({
      schema: result.schema,
      requestId: result.requestId,
      ...(result.repaired ? { repaired: true } : {}),
    });
  }

  return NextResponse.json(
    {
      error: result.error,
      ...(result.errors ? { errors: result.errors } : {}),
      requestId: result.requestId,
    },
    { status: result.status }
  );
}
