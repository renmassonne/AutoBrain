"use client";

import { useEffect, useState } from "react";
import type { GenUISchema } from "@/types/schema";

export function useModifyIdeas(activeTool: GenUISchema | null) {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTool) {
      setIdeas([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/modify-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema: activeTool }),
      signal: controller.signal,
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setIdeas(list.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setIdeas([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTool]);

  return { ideas, loading };
}
