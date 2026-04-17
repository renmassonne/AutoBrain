export function formatOutput(
  value: number | string,
  opts: { format?: string; currency?: string; locale?: string }
): string {
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
}
