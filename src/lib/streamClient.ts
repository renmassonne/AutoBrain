import type { GenUISchema } from "@/types/schema";

interface StreamCallbacks {
  onPartial?: (text: string) => void;
  onRepairing?: (reason?: string) => void;
  onComplete: (schema: GenUISchema, meta: { repaired?: boolean }) => void;
  onError: (error: string) => void;
}

/**
 * Consumes the SSE streaming endpoint. The server emits three kinds of payloads:
 *   { text: "..." }         - raw streamed delta (progressive JSON)
 *   { repairing: true }     - first attempt failed validation, retrying
 *   { schema: {...} }       - final validated schema (terminal)
 *   { error: "..." }        - terminal failure
 * Each SSE message is wrapped as `data: <json>` and the stream is closed by a
 * `data: [DONE]` sentinel.
 */
export async function generateStream(
  body: { prompt: string; modify?: boolean; currentSchema?: GenUISchema },
  callbacks: StreamCallbacks
): Promise<void> {
  const res = await fetch("/api/generate-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No readable stream");

  const decoder = new TextDecoder();
  let accumulated = "";
  let delivered = false;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();

      if (payload === "[DONE]") {
        if (!delivered) {
          // Server ended without delivering a schema or error. Try to parse
          // whatever we accumulated as a last-ditch fallback.
          const clean = stripCodeBlock(accumulated.trim());
          try {
            const schema = JSON.parse(clean) as GenUISchema;
            callbacks.onComplete(schema, {});
          } catch {
            callbacks.onError("Incomplete response from AI");
          }
        }
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          delivered = true;
          callbacks.onError(parsed.error);
          continue;
        }
        if (parsed.schema) {
          delivered = true;
          callbacks.onComplete(parsed.schema as GenUISchema, {
            repaired: Boolean(parsed.repaired),
          });
          continue;
        }
        if (parsed.repairing) {
          callbacks.onRepairing?.(parsed.reason);
          continue;
        }
        if (parsed.text) {
          accumulated += parsed.text;
          callbacks.onPartial?.(accumulated);
        }
      } catch {
        // skip malformed SSE line
      }
    }
  }

  if (!delivered && accumulated.trim()) {
    const clean = stripCodeBlock(accumulated.trim());
    try {
      const schema = JSON.parse(clean) as GenUISchema;
      callbacks.onComplete(schema, {});
    } catch {
      callbacks.onError("Incomplete response from AI");
    }
  }
}

function stripCodeBlock(s: string): string {
  const match = s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  return match ? match[1].trim() : s;
}
