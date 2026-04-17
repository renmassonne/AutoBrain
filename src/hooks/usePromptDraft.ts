"use client";

import { useEffect, useRef, useState } from "react";
import { PROMPT_DRAFT_KEY } from "@/lib/storageKeys";

export function usePromptDraft() {
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(PROMPT_DRAFT_KEY);
      if (draft) setPrompt(draft);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (prompt) sessionStorage.setItem(PROMPT_DRAFT_KEY, prompt);
      else sessionStorage.removeItem(PROMPT_DRAFT_KEY);
    } catch {
      // ignore
    }
  }, [prompt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      promptRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(PROMPT_DRAFT_KEY);
    } catch {
      // ignore
    }
  };

  return { prompt, setPrompt, promptRef, clearDraft };
}
