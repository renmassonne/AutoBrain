"use client";

import { useState, useEffect, useCallback } from "react";
import type { GenUISchema } from "@/types/schema";

const STORAGE_KEY = "autobrain-tools";
const ACTIVE_KEY = "autobrain-active-index";

export function usePersistedTools() {
  const [tools, setToolsState] = useState<GenUISchema[]>([]);
  const [activeIndex, setActiveIndexState] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GenUISchema[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setToolsState(parsed);
          const storedIndex = localStorage.getItem(ACTIVE_KEY);
          const idx = storedIndex !== null ? parseInt(storedIndex, 10) : 0;
          setActiveIndexState(idx >= 0 && idx < parsed.length ? idx : 0);
        }
      }
    } catch {
      // corrupt storage — ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
    } catch {
      // storage full — ignore
    }
  }, [tools, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeIndex !== null) {
      localStorage.setItem(ACTIVE_KEY, String(activeIndex));
    }
  }, [activeIndex, hydrated]);

  const setTools = useCallback((updater: GenUISchema[] | ((prev: GenUISchema[]) => GenUISchema[])) => {
    setToolsState(updater);
  }, []);

  const setActiveIndex = useCallback((idx: number | null) => {
    setActiveIndexState(idx);
  }, []);

  const addTool = useCallback((schema: GenUISchema) => {
    setToolsState((prev) => {
      const next = [...prev, schema];
      setActiveIndexState(next.length - 1);
      return next;
    });
  }, []);

  const updateTool = useCallback((index: number, schema: GenUISchema) => {
    setToolsState((prev) => {
      const next = [...prev];
      next[index] = schema;
      return next;
    });
  }, []);

  const deleteTool = useCallback((index: number) => {
    setToolsState((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveIndexState((currentActive) => {
        if (next.length === 0) return null;
        if (currentActive === null) return null;
        if (currentActive >= next.length) return next.length - 1;
        if (currentActive > index) return currentActive - 1;
        if (currentActive === index) return Math.min(index, next.length - 1);
        return currentActive;
      });
      return next;
    });
  }, []);

  const duplicateTool = useCallback((index: number) => {
    setToolsState((prev) => {
      const original = prev[index];
      if (!original) return prev;
      const copy = { ...original, title: `${original.title} (copy)` };
      const next = [...prev, copy];
      setActiveIndexState(next.length - 1);
      return next;
    });
  }, []);

  const renameTool = useCallback((index: number, newTitle: string) => {
    setToolsState((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], title: newTitle };
      return next;
    });
  }, []);

  return {
    tools,
    activeIndex,
    activeTool: activeIndex !== null ? tools[activeIndex] ?? null : null,
    hydrated,
    setTools,
    setActiveIndex,
    addTool,
    updateTool,
    deleteTool,
    duplicateTool,
    renameTool,
  };
}
