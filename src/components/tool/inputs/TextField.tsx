"use client";

import { Input } from "@/components/ui/input";
import type { SchemaInput, InputValues } from "@/types/schema";

interface TextFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function TextField({ inp, inputValues, setInput }: TextFieldProps) {
  return (
    <Input
      id={inp.key}
      type="text"
      value={String(inputValues[inp.key] ?? "")}
      onChange={(e) => setInput(inp.key, e.target.value)}
    />
  );
}
