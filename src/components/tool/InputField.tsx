"use client";

import type { SchemaInput, InputValues } from "@/types/schema";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/tool/inputs/SliderField";
import { NumberField } from "@/components/tool/inputs/NumberField";
import { SelectField } from "@/components/tool/inputs/SelectField";
import { CheckboxField } from "@/components/tool/inputs/CheckboxField";
import { DateField } from "@/components/tool/inputs/DateField";
import { TextField } from "@/components/tool/inputs/TextField";

function isInputVisible(inp: SchemaInput, inputValues: InputValues): boolean {
  if (!inp.showIf) return true;
  const condValue = inputValues[inp.showIf.key];
  const target = inp.showIf.equals;
  if (typeof target === "boolean") {
    return target
      ? condValue === 1 || condValue === "1"
      : condValue === 0 || condValue === "0" || condValue === "";
  }
  return condValue == target;
}

interface InputFieldProps {
  inp: SchemaInput;
  inputValues: InputValues;
  setInput: (key: string, value: number | string) => void;
}

export function InputField({ inp, inputValues, setInput }: InputFieldProps) {
  if (!isInputVisible(inp, inputValues)) return null;

  const shared = { inp, inputValues, setInput };

  return (
    <div className="space-y-2">
      <Label htmlFor={inp.key}>{inp.label}</Label>
      {inp.type === "slider" ? (
        <SliderField {...shared} />
      ) : inp.type === "number" ? (
        <NumberField {...shared} />
      ) : inp.type === "select" && inp.options ? (
        <SelectField {...shared} />
      ) : inp.type === "checkbox" ? (
        <CheckboxField {...shared} />
      ) : inp.type === "date" ? (
        <DateField {...shared} />
      ) : (
        <TextField {...shared} />
      )}
    </div>
  );
}
