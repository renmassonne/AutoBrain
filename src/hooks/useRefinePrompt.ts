"use client";

import { useCallback, useState } from "react";

export function useRefinePrompt() {
  const [refined, setRefined] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);

  const refine = useCallback(
    async (
      promptText: string,
      setError: (msg: string | null) => void
    ): Promise<void> => {
      const p = promptText.trim();
      if (!p || refining) return;
      setRefining(true);
      setRefined(null);
      setError(null);
      try {
        const res = await fetch("/api/refine-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: p }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Refine failed");
        if (typeof data.prompt === "string" && data.prompt.trim()) {
          setRefined(data.prompt.trim());
        } else {
          setError("Could not refine this prompt");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refine failed");
      } finally {
        setRefining(false);
      }
    },
    [refining]
  );

  const accept = useCallback(
    (setPrompt: (s: string) => void) => {
      if (!refined) return;
      setPrompt(refined);
      setRefined(null);
    },
    [refined]
  );

  const dismiss = useCallback(() => setRefined(null), []);

  return { refined, refining, refine, accept, dismiss };
}
