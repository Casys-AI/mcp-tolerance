/** Display helpers. Precision, signs and units stay engineering-owned. */

export const UNIT_MM = "mm";
export const UNIT_UM = "µm";
export const UNIT_MM2 = "mm²";

export const NOT_CHECKED_CAP = 3;
export const CONTRIBUTOR_CAP = 8;

export function formatNumber(value: number, locale?: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `Expected a finite number; got ${JSON.stringify(value)}.`,
    );
  }
  if (Object.is(value, -0)) return localizeDecimal("0", locale);
  if (Number.isInteger(value)) return localizeDecimal(String(value), locale);
  return localizeDecimal(value.toFixed(6).replace(/\.?0+$/, ""), locale);
}

export function formatSignedNumber(value: number, locale?: string): string {
  const body = formatNumber(value, locale);
  return value > 0 ? `+${body}` : body;
}

export function formatRangeMm(
  range: readonly [number, number],
  locale?: string,
): string {
  return `${formatNumber(range[0], locale)}–${
    formatNumber(range[1], locale)
  } ${UNIT_MM}`;
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

/** Host language changes the decimal mark only; digits, minus and units stay. */
function localizeDecimal(body: string, locale?: string): string {
  if (!body.includes(".")) return body;
  const mark = decimalMark(locale);
  return mark === "." ? body : body.replace(".", mark);
}

function decimalMark(locale?: string): string {
  const resolved = canonicalLocale(locale ?? "");
  if (!resolved) return ".";
  try {
    const parts = new Intl.NumberFormat(resolved, { useGrouping: false })
      .formatToParts(1.1);
    return parts.find((part) => part.type === "decimal")?.value ?? ".";
  } catch {
    return ".";
  }
}

function canonicalLocale(locale: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}
