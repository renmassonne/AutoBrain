"use client";

import { Input } from "@/components/ui/input";
import type { SchemaInput, InputValues } from "@/types/schema";

interface NumberFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function NumberField({ inp, inputValues, setInput }: NumberFieldProps) {
  return (
    <Input
      id={inp.key}
      type="number"
      value={inputValues[inp.key] ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || raw === "-") {
          setInput(inp.key, raw as unknown as number);
          return;
        }
        const num = parseFloat(raw);
        if (!Number.isNaN(num)) setInput(inp.key, num);
      }}
      onBlur={() => {
        const current = inputValues[inp.key];
        if (current === "" || current === "-") {
          setInput(
            inp.key,
            inp.default !== undefined ? Number(inp.default) : 0
          );
        }
      }}
    />
  );
}
