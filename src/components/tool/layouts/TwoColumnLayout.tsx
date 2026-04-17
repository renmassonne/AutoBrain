"use client";

import type { ReactNode } from "react";
import type { GenUISchema, SchemaInput, OutputValues } from "@/types/schema";
import { OutputList } from "@/components/tool/OutputList";

interface TwoColumnLayoutProps {
  schema: GenUISchema;
  outputs: OutputValues;
  renderInput: (inp: SchemaInput) => ReactNode;
}

export function TwoColumnLayout({
  schema,
  outputs,
  renderInput,
}: TwoColumnLayoutProps) {
  const layout = schema.layout;
  if (
    layout?.type !== "two-column" ||
    !layout.sections ||
    layout.sections.length < 2
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {layout.sections.map((section) => {
          const sectionInputs = schema.inputs.filter((inp) =>
            section.keys.includes(inp.key)
          );
          return (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              {sectionInputs.map(renderInput)}
            </div>
          );
        })}
      </div>
      <OutputList schema={schema} outputs={outputs} />
    </div>
  );
}
