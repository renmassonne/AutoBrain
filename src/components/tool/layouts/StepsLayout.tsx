"use client";

import type { ReactNode } from "react";
import type { GenUISchema, SchemaInput, OutputValues } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { OutputList } from "@/components/tool/OutputList";

interface StepsLayoutProps {
  schema: GenUISchema;
  outputs: OutputValues;
  activeTab: number;
  setActiveTab: (updater: (p: number) => number) => void;
  renderInput: (inp: SchemaInput) => ReactNode;
}

export function StepsLayout({
  schema,
  outputs,
  activeTab,
  setActiveTab,
  renderInput,
}: StepsLayoutProps) {
  const layout = schema.layout;
  if (layout?.type !== "steps" || !layout.sections || layout.sections.length === 0) {
    return null;
  }
  const section = layout.sections[activeTab] ?? layout.sections[0];
  const sectionInputs = schema.inputs.filter((inp) =>
    section.keys.includes(inp.key)
  );
  const isLast = activeTab === layout.sections.length - 1;
  const isFirst = activeTab === 0;
  const sections = layout.sections;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {sections.map((sec, i) => (
          <div key={sec.title} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
                i <= activeTab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i === activeTab ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {sec.title}
            </span>
            {i < sections.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>
      <div className="space-y-4">{sectionInputs.map(renderInput)}</div>
      <div className="flex gap-2 pt-2">
        {!isFirst && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab((p) => p - 1)}
          >
            Back
          </Button>
        )}
        {!isLast && (
          <Button size="sm" onClick={() => setActiveTab((p) => p + 1)}>
            Next
          </Button>
        )}
      </div>
      {isLast && <OutputList schema={schema} outputs={outputs} />}
    </div>
  );
}
