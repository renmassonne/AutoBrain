"use client";

import type { GenUISchema, OutputValues } from "@/types/schema";
import { formatOutput } from "@/lib/formatOutput";

interface OutputListProps {
  schema: GenUISchema;
  outputs: OutputValues;
  /** If set, only these output keys are shown (e.g. tab section keys). */
  keys?: string[];
}

export function OutputList({ schema, outputs, keys }: OutputListProps) {
  const outs = keys
    ? schema.outputs.filter((o) => keys.includes(o.key))
    : schema.outputs;
  if (outs.length === 0) return null;
  return (
    <div className="space-y-2 pt-2 border-t">
      {outs.map((out) => (
        <div
          key={out.key}
          className="flex justify-between items-baseline gap-4"
        >
          <span className="text-sm text-muted-foreground">{out.label}</span>
          <span className="font-semibold tabular-nums text-lg">
            {formatOutput(outputs[out.key] ?? 0, {
              format: out.format,
              currency: out.currency,
              locale: out.locale,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
