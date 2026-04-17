"use client";

import { Slider } from "@/components/ui/slider";
import type { SchemaInput, InputValues } from "@/types/schema";

interface SliderFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function SliderField({ inp, inputValues, setInput }: SliderFieldProps) {
  return (
    <div className="flex gap-3 items-center">
      <Slider
        min={inp.min ?? 0}
        max={inp.max ?? 100}
        value={Number(inputValues[inp.key]) || 0}
        onValueChange={(v) => setInput(inp.key, v)}
      />
      <span className="text-sm text-muted-foreground tabular-nums min-w-[3rem] text-right">
        {Number(inputValues[inp.key] ?? inp.min ?? 0).toLocaleString()}
      </span>
    </div>
  );
}
