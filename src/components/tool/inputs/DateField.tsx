"use client";

import { Input } from "@/components/ui/input";
import type { SchemaInput, InputValues } from "@/types/schema";

interface DateFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function DateField({ inp, inputValues, setInput }: DateFieldProps) {
  return (
    <Input
      id={inp.key}
      type="date"
      value={String(inputValues[inp.key] ?? "")}
      onChange={(e) => setInput(inp.key, e.target.value)}
    />
  );
}
