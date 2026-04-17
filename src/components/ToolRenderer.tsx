"use client";

import { useMemo, useCallback, useState } from "react";
import type { GenUISchema, SchemaInput, InputValues, OutputValues } from "@/types/schema";
import { computeOutputs, getDefaultInputValues } from "@/lib/calculator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolChart } from "@/components/ToolChart";
import { InputField } from "@/components/tool/InputField";
import { TabsLayout } from "@/components/tool/layouts/TabsLayout";
import { TwoColumnLayout } from "@/components/tool/layouts/TwoColumnLayout";
import { StepsLayout } from "@/components/tool/layouts/StepsLayout";
import { SingleLayout } from "@/components/tool/layouts/SingleLayout";

interface ToolRendererProps {
  schema: GenUISchema;
  className?: string;
}

export function ToolRenderer({ schema, className }: ToolRendererProps) {
  const [inputValues, setInputValues] = useState<InputValues>(() =>
    getDefaultInputValues(schema)
  );
  const [activeTab, setActiveTab] = useState(0);

  const outputs = useMemo<OutputValues>(
    () => computeOutputs(schema, inputValues),
    [schema, inputValues]
  );

  const setInput = useCallback((key: string, value: number | string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const renderInput = useCallback(
    (inp: SchemaInput) => (
      <InputField
        key={inp.key}
        inp={inp}
        inputValues={inputValues}
        setInput={setInput}
      />
    ),
    [inputValues, setInput]
  );

  const renderContent = () => {
    const layout = schema.layout;

    if (layout?.type === "tabs" && layout.sections && layout.sections.length > 0) {
      return (
        <TabsLayout
          schema={schema}
          outputs={outputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          renderInput={renderInput}
        />
      );
    }

    if (
      layout?.type === "two-column" &&
      layout.sections &&
      layout.sections.length >= 2
    ) {
      return (
        <TwoColumnLayout
          schema={schema}
          outputs={outputs}
          renderInput={renderInput}
        />
      );
    }

    if (layout?.type === "steps" && layout.sections && layout.sections.length > 0) {
      return (
        <StepsLayout
          schema={schema}
          outputs={outputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          renderInput={renderInput}
        />
      );
    }

    return (
      <SingleLayout schema={schema} outputs={outputs} renderInput={renderInput} />
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{schema.title}</CardTitle>
        {schema.description && (
          <CardDescription>{schema.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {renderContent()}

        {schema.chart && (
          <ToolChart
            type={schema.chart.type}
            dataKey={schema.chart.dataKey}
            label={schema.chart.label}
            series={schema.chart.series}
            value={Number(outputs[schema.chart.dataKey]) || 0}
            inputValues={inputValues}
            outputs={outputs}
            schema={schema}
          />
        )}
      </CardContent>
    </Card>
  );
}
