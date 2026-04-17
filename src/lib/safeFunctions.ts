/**
 * Canonical allowlist for formula functions (validator + calculator must match).
 */
export const SAFE_FUNCTIONS: Record<string, Function> = {
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

export const SAFE_FUNC_NAMES = new Set(Object.keys(SAFE_FUNCTIONS));
