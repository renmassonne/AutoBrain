"use client";

import { useMemo, useCallback, useState } from "react";
import type { GenUISchema, SchemaInput, InputValues, OutputValues } from "@/types/schema";
import { computeOutputs, getDefaultInputValues } from "@/lib/calculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ToolChart } from "./ToolChart";

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

  const formatOutput = (
    value: number | string,
    opts: { format?: string; currency?: string; locale?: string }
  ): string => {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value);
    const locale = opts.locale || "en-US";
    if (opts.format === "currency") {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: opts.currency || "USD",
        }).format(num);
      } catch {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(num);
      }
    }
    if (opts.format === "percent") return `${num.toFixed(1)}%`;
    try {
      return num.toLocaleString(locale, { maximumFractionDigits: 2 });
    } catch {
      return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
  };

  const isInputVisible = (inp: SchemaInput): boolean => {
    if (!inp.showIf) return true;
    const condValue = inputValues[inp.showIf.key];
    const target = inp.showIf.equals;
    if (typeof target === "boolean") {
      return target ? (condValue === 1 || condValue === "1") : (condValue === 0 || condValue === "0" || condValue === "");
    }
    return condValue == target; // loose equality for number/string coercion
  };

  const renderInput = (inp: SchemaInput) => {
    if (!isInputVisible(inp)) return null;

    return (
      <div key={inp.key} className="space-y-2">
        <Label htmlFor={inp.key}>{inp.label}</Label>
        {inp.type === "slider" ? (
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
        ) : inp.type === "number" ? (
          <Input
            id={inp.key}
            type="number"
            value={inputValues[inp.key] ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "-") {
                setInput(inp.key, raw as unknown as number);
                return;
              }
              const num = parseFloat(raw);
              if (!Number.isNaN(num)) setInput(inp.key, num);
            }}
            onBlur={() => {
              const current = inputValues[inp.key];
              if (current === "" || current === "-") {
                setInput(inp.key, inp.default !== undefined ? Number(inp.default) : 0);
              }
            }}
          />
        ) : inp.type === "select" && inp.options ? (
          <select
            id={inp.key}
            value={String(inputValues[inp.key] ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              const num = parseFloat(v);
              setInput(inp.key, Number.isNaN(num) ? v : num);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {inp.options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : inp.type === "checkbox" ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id={inp.key}
              checked={inputValues[inp.key] === 1 || inputValues[inp.key] === "1"}
              onChange={(e) => setInput(inp.key, e.target.checked ? 1 : 0)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm text-muted-foreground">Enabled</span>
          </label>
        ) : inp.type === "date" ? (
          <Input
            id={inp.key}
            type="date"
            value={String(inputValues[inp.key] ?? "")}
            onChange={(e) => setInput(inp.key, e.target.value)}
          />
        ) : (
          <Input
            id={inp.key}
            type="text"
            value={String(inputValues[inp.key] ?? "")}
            onChange={(e) => setInput(inp.key, e.target.value)}
          />
        )}
      </div>
    );
  };

  const renderOutputs = (keys?: string[]) => {
    const outs = keys
      ? schema.outputs.filter((o) => keys.includes(o.key))
      : schema.outputs;
    if (outs.length === 0) return null;
    return (
      <div className="space-y-2 pt-2 border-t">
        {outs.map((out) => (
          <div key={out.key} className="flex justify-between items-baseline gap-4">
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
  };

  const renderContent = () => {
    const layout = schema.layout;

    // -- TAB LAYOUT --
    if (layout?.type === "tabs" && layout.sections && layout.sections.length > 0) {
      const section = layout.sections[activeTab] ?? layout.sections[0];
      const sectionInputs = schema.inputs.filter((inp) => section.keys.includes(inp.key));
      const sectionOutputKeys = section.keys;
      return (
        <div className="space-y-4">
          <div className="flex gap-1 border-b">
            {layout.sections.map((sec, i) => (
              <button
                key={sec.title}
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
          <div className="space-y-4">
            {sectionInputs.map(renderInput)}
          </div>
          {renderOutputs(sectionOutputKeys)}
        </div>
      );
    }

    // -- TWO-COLUMN LAYOUT --
    if (layout?.type === "two-column" && layout.sections && layout.sections.length >= 2) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {layout.sections.map((section) => {
              const sectionInputs = schema.inputs.filter((inp) => section.keys.includes(inp.key));
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
          {renderOutputs()}
        </div>
      );
    }

    // -- STEPS LAYOUT --
    if (layout?.type === "steps" && layout.sections && layout.sections.length > 0) {
      const section = layout.sections[activeTab] ?? layout.sections[0];
      const sectionInputs = schema.inputs.filter((inp) => section.keys.includes(inp.key));
      const isLast = activeTab === layout.sections.length - 1;
      const isFirst = activeTab === 0;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {layout.sections.map((sec, i) => (
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
                <span className={`text-xs hidden sm:inline ${i === activeTab ? "font-medium" : "text-muted-foreground"}`}>
                  {sec.title}
                </span>
                {i < layout.sections!.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {sectionInputs.map(renderInput)}
          </div>
          <div className="flex gap-2 pt-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab((p) => p - 1)}>
                Back
              </Button>
            )}
            {!isLast && (
              <Button size="sm" onClick={() => setActiveTab((p) => p + 1)}>
                Next
              </Button>
            )}
          </div>
          {isLast && renderOutputs()}
        </div>
      );
    }

    // -- DEFAULT SINGLE LAYOUT --
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {schema.inputs.map(renderInput)}
        </div>
        {renderOutputs()}
      </div>
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
