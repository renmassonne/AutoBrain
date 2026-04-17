"use client";

import type { ReactNode } from "react";
import type { GenUISchema, SchemaInput, OutputValues } from "@/types/schema";
import { OutputList } from "@/components/tool/OutputList";

interface SingleLayoutProps {
  schema: GenUISchema;
  outputs: OutputValues;
  renderInput: (inp: SchemaInput) => ReactNode;
}

export function SingleLayout({
  schema,
  outputs,
  renderInput,
}: SingleLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">{schema.inputs.map(renderInput)}</div>
      <OutputList schema={schema} outputs={outputs} />
    </div>
  );
}
