"use client";

import { useCallback, useEffect, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  return { toast, showToast };
}
