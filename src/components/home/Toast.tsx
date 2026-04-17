"use client";

import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
