import type { GenUISchema, InputValues, OutputValues } from "@/types/schema";

const SAFE_FUNCTIONS: Record<string, Function> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  pow: Math.pow,
  sqrt: Math.sqrt,
  SUM: (...args: number[]) => args.reduce((a, b) => a + b, 0),
};

const SAFE_FUNC_NAMES = new Set(Object.keys(SAFE_FUNCTIONS));

/**
 * Safely evaluate a math expression.
 * After variable substitution the only remaining identifiers should be
 * our safe function names. Anything else is rejected.
 */
function safeEval(expr: string, funcs: Record<string, Function>): number {
  const identifiers = expr.match(/[a-zA-Z_]\w*/g) || [];
  for (const id of identifiers) {
    if (!SAFE_FUNC_NAMES.has(id)) return NaN;
  }

  const stripped = expr.replace(/[a-zA-Z_]\w*/g, "").replace(/\s/g, "");
  if (!/^[\d+\-*/().,?:<>=!]*$/.test(stripped)) return NaN;

  const paramNames = Object.keys(funcs);
  const paramValues = Object.values(funcs);

  try {
    const fn = new Function(...paramNames, `"use strict"; return (${expr})`);
    const result = fn(...paramValues) as number;
    if (!Number.isFinite(result)) return 0;
    return result;
  } catch {
    return NaN;
  }
}

function parseLogicLine(line: string): { outputKey: string; expression: string } | null {
  const clean = line.replace(/;+\s*$/, "").trim();
  const eq = clean.indexOf("=");
  if (eq === -1) return null;
  if (clean[eq + 1] === "=" || clean[eq - 1] === "!" || clean[eq - 1] === ">" || clean[eq - 1] === "<") return null;
  const outputKey = clean.slice(0, eq).trim();
  const expression = clean.slice(eq + 1).trim();
  if (!outputKey || !expression) return null;
  return { outputKey, expression };
}

function substitute(expression: string, values: InputValues): string {
  let result = expression;
  const sortedKeys = Object.keys(values).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (SAFE_FUNC_NAMES.has(key)) continue;
    const value = values[key];
    const num = typeof value === "number" ? value : parseFloat(String(value));
    const numStr = Number.isNaN(num) ? "0" : String(num);
    result = result.replace(new RegExp(`\\b${escapeRegExp(key)}\\b`, "g"), numStr);
  }
  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function computeOutputs(schema: GenUISchema, inputValues: InputValues): OutputValues {
  const outputs: OutputValues = {};
  const logicText = schema.logic || "";
  const lines = logicText
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parsed = parseLogicLine(line);
    if (!parsed) continue;
    const { outputKey, expression } = parsed;
    const context = { ...inputValues, ...outputs };
    const substituted = substitute(expression, context);
    const value = safeEval(substituted, SAFE_FUNCTIONS);
    outputs[outputKey] = Number.isNaN(value) ? 0 : Math.round(value * 100) / 100;
  }

  return outputs;
}

export function getDefaultInputValues(schema: GenUISchema): InputValues {
  const values: InputValues = {};
  for (const input of schema.inputs) {
    if (input.default !== undefined) {
      values[input.key] = input.default;
    } else if (input.type === "number" || input.type === "slider") {
      values[input.key] = input.min ?? 0;
    } else if (input.type === "checkbox") {
      values[input.key] = 0;
    } else {
      values[input.key] = "";
    }
  }
  return values;
}
