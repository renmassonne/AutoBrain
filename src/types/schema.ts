export type InputType = "number" | "slider" | "text" | "select" | "checkbox" | "date";

export interface SchemaInput {
  label: string;
  type: InputType;
  key: string;
  min?: number;
  max?: number;
  default?: number | string;
  options?: { label: string; value: string | number }[];
  /** Conditional visibility: show this input only when another input has a specific value */
  showIf?: { key: string; equals: string | number | boolean };
}

export interface SchemaOutput {
  label: string;
  key: string;
  format?: string;
  /** ISO 4217 currency code (e.g. "EUR"). Only used when format === "currency". */
  currency?: string;
  /** BCP47 locale (e.g. "de-DE"). Used for number/currency formatting. */
  locale?: string;
}

export interface GenUISchema {
  title: string;
  description?: string;
  inputs: SchemaInput[];
  logic: string;
  outputs: SchemaOutput[];
  chart?: {
    type: "bar" | "line" | "pie";
    dataKey: string;
    label?: string;
    /** Optional explicit list of input/output keys to plot as the chart series. */
    series?: string[];
  };
  layout?: {
    type: "single" | "two-column" | "tabs" | "steps";
    sections?: { title: string; keys: string[] }[];
  };
}

export type InputValues = Record<string, number | string>;
export type OutputValues = Record<string, number | string>;
