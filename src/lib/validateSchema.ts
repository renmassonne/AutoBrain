import type { GenUISchema, SchemaInput, SchemaOutput } from "@/types/schema";
import { SAFE_FUNC_NAMES } from "@/lib/safeFunctions";

export { SAFE_FUNC_NAMES };

const VALID_INPUT_TYPES = new Set<SchemaInput["type"]>([
  "number",
  "slider",
  "text",
  "select",
  "checkbox",
  "date",
]);

const VALID_FORMATS = new Set(["currency", "percent", "number"]);
const VALID_CHART_TYPES = new Set(["bar", "line", "pie"]);
const VALID_LAYOUT_TYPES = new Set(["single", "two-column", "tabs", "steps"]);

const IDENT_RE = /^[a-zA-Z_$][\w$]*$/;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** The same schema reference, convenience for chaining. */
  schema: GenUISchema;
}

/**
 * Validate a GenUI schema coming from the model. Returns a list of
 * specific, human readable error strings suitable to feed back into a
 * repair prompt. We intentionally collect all errors (not short-circuit)
 * so the model can fix them in a single repair pass.
 */
export function validateGenUISchema(input: unknown): ValidationResult {
  const errors: string[] = [];
  const schema = (input ?? {}) as GenUISchema;

  if (!schema || typeof schema !== "object") {
    return {
      ok: false,
      errors: ["Response is not a JSON object"],
      schema: schema as GenUISchema,
    };
  }

  if (!schema.title || typeof schema.title !== "string") {
    errors.push('Field "title" must be a non-empty string');
  }
  if (!Array.isArray(schema.inputs)) {
    errors.push('Field "inputs" must be an array');
  }
  if (!Array.isArray(schema.outputs)) {
    errors.push('Field "outputs" must be an array');
  }
  if (typeof schema.logic !== "string") {
    errors.push('Field "logic" must be a string of newline-separated assignments');
  }

  if (errors.length > 0) {
    return { ok: false, errors, schema };
  }

  const inputs: SchemaInput[] = schema.inputs;
  const outputs: SchemaOutput[] = schema.outputs;

  // --- inputs ---
  const inputKeys = new Set<string>();
  inputs.forEach((inp, i) => {
    const where = `inputs[${i}] (${inp?.key ?? "?"})`;
    if (!inp || typeof inp !== "object") {
      errors.push(`${where}: must be an object`);
      return;
    }
    if (!inp.key || !IDENT_RE.test(inp.key)) {
      errors.push(`${where}: key must be a valid camelCase identifier`);
    } else if (inputKeys.has(inp.key)) {
      errors.push(`${where}: duplicate input key "${inp.key}"`);
    } else {
      inputKeys.add(inp.key);
    }
    if (!inp.label || typeof inp.label !== "string") {
      errors.push(`${where}: label must be a non-empty string`);
    }
    if (!VALID_INPUT_TYPES.has(inp.type)) {
      errors.push(
        `${where}: type must be one of number|slider|text|select|checkbox|date (got "${inp.type}")`
      );
    }
    if (inp.type === "slider") {
      if (typeof inp.min !== "number" || typeof inp.max !== "number") {
        errors.push(`${where}: slider requires numeric "min" and "max"`);
      } else if (inp.max <= inp.min) {
        errors.push(`${where}: slider "max" must be greater than "min"`);
      }
    }
    if (inp.type === "select") {
      if (!Array.isArray(inp.options) || inp.options.length === 0) {
        errors.push(`${where}: select requires a non-empty "options" array`);
      } else {
        inp.options.forEach((opt, j) => {
          if (
            !opt ||
            typeof opt !== "object" ||
            typeof opt.label !== "string" ||
            (typeof opt.value !== "string" && typeof opt.value !== "number")
          ) {
            errors.push(`${where}.options[${j}]: must be { label: string, value: string|number }`);
          }
        });
      }
    }
    if (inp.showIf) {
      if (!inp.showIf.key || !IDENT_RE.test(inp.showIf.key)) {
        errors.push(`${where}.showIf.key: must be a valid identifier`);
      }
    }
  });

  // --- outputs ---
  const outputKeys = new Set<string>();
  outputs.forEach((out, i) => {
    const where = `outputs[${i}] (${out?.key ?? "?"})`;
    if (!out || typeof out !== "object") {
      errors.push(`${where}: must be an object`);
      return;
    }
    if (!out.key || !IDENT_RE.test(out.key)) {
      errors.push(`${where}: key must be a valid camelCase identifier`);
    } else if (outputKeys.has(out.key)) {
      errors.push(`${where}: duplicate output key "${out.key}"`);
    } else {
      outputKeys.add(out.key);
    }
    if (!out.label || typeof out.label !== "string") {
      errors.push(`${where}: label must be a non-empty string`);
    }
    if (out.format !== undefined && !VALID_FORMATS.has(out.format)) {
      errors.push(
        `${where}: format must be one of currency|percent|number (got "${out.format}")`
      );
    }
    if (inputKeys.has(out.key)) {
      errors.push(`${where}: output key "${out.key}" collides with an input key`);
    }
  });

  // --- logic ---
  const logicOutputKeys = new Set<string>();
  const logicLines = (schema.logic || "")
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Track intermediate keys assigned in logic (not declared in outputs). These
  // are allowed as RHS references in later lines.
  const intermediateKeys = new Set<string>();

  logicLines.forEach((line, i) => {
    const where = `logic line ${i + 1}`;
    const eq = line.indexOf("=");
    if (
      eq === -1 ||
      line[eq + 1] === "=" ||
      line[eq - 1] === "!" ||
      line[eq - 1] === ">" ||
      line[eq - 1] === "<"
    ) {
      errors.push(`${where}: must be an assignment "key = expression"`);
      return;
    }
    const lhs = line.slice(0, eq).trim();
    const rhs = line.slice(eq + 1).trim();
    if (!IDENT_RE.test(lhs)) {
      errors.push(`${where}: left-hand side "${lhs}" is not a valid identifier`);
      return;
    }
    if (outputKeys.has(lhs)) {
      logicOutputKeys.add(lhs);
    } else {
      intermediateKeys.add(lhs);
    }
    if (!rhs) {
      errors.push(`${where}: missing expression on right-hand side`);
      return;
    }

    const identifiers = rhs.match(/[a-zA-Z_$][\w$]*/g) || [];
    for (const id of identifiers) {
      if (SAFE_FUNC_NAMES.has(id)) continue;
      if (inputKeys.has(id)) continue;
      if (logicOutputKeys.has(id)) continue;
      if (intermediateKeys.has(id)) continue;
      // Note: references to an outputKey BEFORE it's assigned are still rejected;
      // the model must order logic lines so every RHS key is already defined.
      errors.push(
        `${where}: unknown identifier "${id}" on right-hand side (not an input, prior output or safe function)`
      );
    }

    // Only math/comparison/ternary characters should remain after identifiers.
    const stripped = rhs.replace(/[a-zA-Z_$][\w$]*/g, "").replace(/\s/g, "");
    if (!/^[\d+\-*/().,?:<>=!]*$/.test(stripped)) {
      errors.push(
        `${where}: expression contains unsupported characters (allowed: numbers, + - * / ( ) , ? : < > = !)`
      );
    }
  });

  for (const out of outputs) {
    if (!out.key) continue;
    if (!logicOutputKeys.has(out.key)) {
      errors.push(
        `output "${out.key}" is never assigned in "logic" (every output key must appear as the left-hand side of at least one logic line)`
      );
    }
  }

  // --- chart ---
  if (schema.chart) {
    if (!VALID_CHART_TYPES.has(schema.chart.type)) {
      errors.push(
        `chart.type must be one of bar|line|pie (got "${schema.chart.type}")`
      );
    }
    if (!schema.chart.dataKey || !IDENT_RE.test(schema.chart.dataKey)) {
      errors.push(`chart.dataKey must be a valid identifier`);
    } else if (!outputKeys.has(schema.chart.dataKey)) {
      errors.push(
        `chart.dataKey "${schema.chart.dataKey}" must reference an existing output key`
      );
    }
    if (schema.chart.series !== undefined) {
      if (!Array.isArray(schema.chart.series)) {
        errors.push(`chart.series must be an array of input/output keys`);
      } else {
        schema.chart.series.forEach((k, i) => {
          if (typeof k !== "string" || !IDENT_RE.test(k)) {
            errors.push(`chart.series[${i}]: "${k}" is not a valid identifier`);
          } else if (!inputKeys.has(k) && !outputKeys.has(k)) {
            errors.push(
              `chart.series[${i}]: "${k}" is neither an input nor an output key`
            );
          }
        });
      }
    }
  }

  // --- layout ---
  if (schema.layout) {
    if (!VALID_LAYOUT_TYPES.has(schema.layout.type)) {
      errors.push(
        `layout.type must be one of single|two-column|tabs|steps (got "${schema.layout.type}")`
      );
    }
    if (schema.layout.sections) {
      if (!Array.isArray(schema.layout.sections)) {
        errors.push(`layout.sections must be an array`);
      } else {
        schema.layout.sections.forEach((sec, i) => {
          const where = `layout.sections[${i}]`;
          if (!sec || typeof sec !== "object") {
            errors.push(`${where}: must be an object`);
            return;
          }
          if (!sec.title || typeof sec.title !== "string") {
            errors.push(`${where}.title: must be a non-empty string`);
          }
          if (!Array.isArray(sec.keys)) {
            errors.push(`${where}.keys: must be an array of input/output keys`);
            return;
          }
          sec.keys.forEach((k, j) => {
            if (typeof k !== "string" || !IDENT_RE.test(k)) {
              errors.push(`${where}.keys[${j}]: "${k}" is not a valid identifier`);
            } else if (!inputKeys.has(k) && !outputKeys.has(k)) {
              errors.push(
                `${where}.keys[${j}]: "${k}" is neither an input nor an output key`
              );
            }
          });
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, schema };
}
