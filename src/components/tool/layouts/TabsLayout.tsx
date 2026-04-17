"use client";

import type { ReactNode } from "react";
import type { GenUISchema, SchemaInput, OutputValues } from "@/types/schema";
import { OutputList } from "@/components/tool/OutputList";

interface TabsLayoutProps {
  schema: GenUISchema;
  outputs: OutputValues;
  activeTab: number;
  setActiveTab: (i: number) => void;
  renderInput: (inp: SchemaInput) => ReactNode;
}

export function TabsLayout({
  schema,
  outputs,
  activeTab,
  setActiveTab,
  renderInput,
}: TabsLayoutProps) {
  const layout = schema.layout;
  if (layout?.type !== "tabs" || !layout.sections || layout.sections.length === 0) {
    return null;
  }
  const section = layout.sections[activeTab] ?? layout.sections[0];
  const sectionInputs = schema.inputs.filter((inp) =>
    section.keys.includes(inp.key)
  );
  const sectionOutputKeys = section.keys;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {layout.sections.map((sec, i) => (
          <button
            key={sec.title}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>
      <div className="space-y-4">{sectionInputs.map(renderInput)}</div>
      <OutputList schema={schema} outputs={outputs} keys={sectionOutputKeys} />
    </div>
  );
}
