/** Deterministic, locale-independent display helpers. */

export const UNIT_MM = "mm";
export const UNIT_UM = "µm";
export const UNIT_MM2 = "mm²";

export const NOT_CHECKED_CAP = 3;
export const CONTRIBUTOR_CAP = 8;

export function formatNumber(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `Expected a finite number; got ${JSON.stringify(value)}.`,
    );
  }
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(6).replace(/\.?0+$/, "");
}

export function formatSignedNumber(value: number): string {
  const body = formatNumber(value);
  return value > 0 ? `+${body}` : body;
}

export function formatRangeMm(range: readonly [number, number]): string {
  return `${formatNumber(range[0])}–${formatNumber(range[1])} ${UNIT_MM}`;
}

export function capList<T>(
  items: readonly T[],
  cap: number,
): { readonly items: readonly T[]; readonly omitted: number } {
  if (!Array.isArray(items)) {
    throw new TypeError("Expected an array to cap.");
  }
  if (!Number.isInteger(cap) || cap < 0) {
    throw new TypeError("Cap must be a non-negative integer.");
  }
  return {
    items: items.slice(0, cap),
    omitted: Math.max(0, items.length - cap),
  };
}

export function omittedLabel(
  omitted: number,
  noun: string,
): string | undefined {
  if (!Number.isInteger(omitted) || omitted < 0) {
    throw new TypeError("Omitted count must be a non-negative integer.");
  }
  if (omitted === 0) return undefined;
  if (omitted === 1) {
    const singular = noun.endsWith("s") ? noun.slice(0, -1) : noun;
    return `1 more ${singular} omitted`;
  }
  return `${omitted} more ${noun} omitted`;
}
