"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import type { GenUISchema, InputValues, OutputValues } from "@/types/schema";

interface ToolChartProps {
  type: "bar" | "line" | "pie";
  dataKey: string;
  label?: string;
  value: number;
  inputValues: InputValues;
  outputs: OutputValues;
  schema: GenUISchema;
  /** Optional explicit list of input/output keys to plot. */
  series?: string[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "#94a3b8",
  "#cbd5e1",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ec4899",
];

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim().replace(/^./, (c) => c.toUpperCase());
}

function coerceNumber(v: number | string | undefined): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Build chart data.
 *   - If `series` is provided, use it verbatim (looked up in inputs then outputs).
 *     The label for each point uses the schema's `label` where available.
 *   - Otherwise fall back to a reasonable default: all inputs + the target output.
 */
function buildChartData(
  schema: GenUISchema,
  inputValues: InputValues,
  outputs: OutputValues,
  series: string[] | undefined,
  dataKey: string,
  fallbackLabel: string,
  fallbackValue: number
): { name: string; value: number }[] {
  if (series && series.length > 0) {
    const inputLabels = new Map(schema.inputs.map((i) => [i.key, i.label]));
    const outputLabels = new Map(schema.outputs.map((o) => [o.key, o.label]));
    return series
      .map((key) => {
        const label = inputLabels.get(key) || outputLabels.get(key) || humanize(key);
        if (key in inputValues) {
          return { name: label, value: coerceNumber(inputValues[key]) };
        }
        if (key in outputs) {
          return { name: label, value: coerceNumber(outputs[key]) };
        }
        return null;
      })
      .filter((d): d is { name: string; value: number } => d !== null && !!d.name);
  }

  return [
    ...Object.entries(inputValues)
      .filter(([key]) => {
        const inp = schema.inputs.find((i) => i.key === key);
        return inp && (inp.type === "number" || inp.type === "slider");
      })
      .map(([key, val]) => {
        const inp = schema.inputs.find((i) => i.key === key);
        return {
          name: inp?.label || humanize(key),
          value: coerceNumber(val),
        };
      }),
    { name: fallbackLabel || humanize(dataKey), value: fallbackValue },
  ].filter((d) => d.name);
}

export function ToolChart({
  type,
  dataKey,
  label,
  value,
  inputValues,
  outputs,
  schema,
  series,
}: ToolChartProps) {
  const data = buildChartData(
    schema,
    inputValues,
    outputs,
    series,
    dataKey,
    label || "",
    value
  );

  if (data.length === 0) return null;

  if (type === "pie") {
    const pieData = data.map((d, i) => ({
      ...d,
      fill: COLORS[i % COLORS.length],
    }));
    return (
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
