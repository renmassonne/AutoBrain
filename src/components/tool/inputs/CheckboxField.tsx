"use client";

import type { SchemaInput, InputValues } from "@/types/schema";

interface CheckboxFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function CheckboxField({
  inp,
  inputValues,
  setInput,
}: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        id={inp.key}
        checked={inputValues[inp.key] === 1 || inputValues[inp.key] === "1"}
        onChange={(e) => setInput(inp.key, e.target.checked ? 1 : 0)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      <span className="text-sm text-muted-foreground">Enabled</span>
    </label>
  );
}
