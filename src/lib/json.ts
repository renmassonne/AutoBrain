import { NextResponse } from "next/server";

export function stripCodeBlock(s: string): string {
  const match = s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  return match ? match[1].trim() : s;
}

export function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}

/** JSON error response for API routes (NextResponse). */
export function jsonError(
  status: number,
  error: string,
  extras?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...extras }, { status });
}

/** Plain Response JSON error (e.g. SSE route before stream starts). */
export function jsonErrorResponse(
  status: number,
  error: string,
  extras?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({ error, ...extras }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
