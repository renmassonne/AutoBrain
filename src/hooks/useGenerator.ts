"use client";

import { useCallback, useState } from "react";
import type { GenUISchema } from "@/types/schema";
import { generateStream } from "@/lib/streamClient";

interface UseGeneratorArgs {
  activeIndex: number | null;
  activeTool: GenUISchema | null;
  addTool: (schema: GenUISchema) => void;
  updateTool: (index: number, schema: GenUISchema) => void;
  showToast: (msg: string) => void;
  setPrompt: (s: string) => void;
  clearDraft: () => void;
  onClearRefined: () => void;
}

export function useGenerator({
  activeIndex,
  activeTool,
  addTool,
  updateTool,
  showToast,
  setPrompt,
  clearDraft,
  onClearRefined,
}: UseGeneratorArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<string | null>(null);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [modifyPrompt, setModifyPrompt] = useState("");

  const callGenerate = useCallback(
    async (userPrompt: string, isModify: boolean) => {
      setError(null);
      setLoading(true);
      setStreamPreview(null);
      setRepairing(null);
      onClearRefined();

      try {
        const currentActive = isModify ? activeTool : null;
        const body =
          isModify && currentActive
            ? { prompt: userPrompt, modify: true, currentSchema: currentActive }
            : { prompt: userPrompt };

        await generateStream(body, {
          onPartial: (text) => setStreamPreview(text),
          onRepairing: (reason) =>
            setRepairing(reason || "Fixing the generated schema…"),
          onComplete: (schema, meta) => {
            if (isModify && activeIndex !== null) {
              updateTool(activeIndex, schema);
              showToast(
                meta.repaired
                  ? "Tool updated (auto-repaired)"
                  : "Tool updated"
              );
            } else {
              addTool(schema);
              setPrompt("");
              clearDraft();
              showToast(
                meta.repaired
                  ? "Tool created (auto-repaired)"
                  : "Tool created"
              );
            }
            setStreamPreview(null);
            setRepairing(null);
            setModifyPrompt("");
          },
          onError: (msg) => {
            setError(msg);
            setStreamPreview(null);
            setRepairing(null);
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStreamPreview(null);
        setRepairing(null);
      } finally {
        setLoading(false);
      }
    },
    [
      activeIndex,
      activeTool,
      addTool,
      updateTool,
      showToast,
      setPrompt,
      clearDraft,
      onClearRefined,
    ]
  );

  const generate = useCallback(
    (promptText: string) => {
      if (!promptText.trim()) return;
      callGenerate(promptText.trim(), false);
    },
    [callGenerate]
  );

  const modify = useCallback(
    (modifyText: string) => {
      if (!modifyText.trim() || activeIndex === null) return;
      callGenerate(modifyText.trim(), true);
    },
    [activeIndex, callGenerate]
  );

  return {
    loading,
    error,
    setError,
    streamPreview,
    repairing,
    modifyPrompt,
    setModifyPrompt,
    generate,
    modify,
    callGenerate,
  };
}
