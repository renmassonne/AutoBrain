"use client";

import type { SchemaInput, InputValues } from "@/types/schema";

interface SelectFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function SelectField({ inp, inputValues, setInput }: SelectFieldProps) {
  if (!inp.options) return null;
  return (
    <select
      id={inp.key}
      value={String(inputValues[inp.key] ?? "")}
      onChange={(e) => {
        const v = e.target.value;
        const num = parseFloat(v);
        setInput(inp.key, Number.isNaN(num) ? v : num);
      }}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {inp.options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
