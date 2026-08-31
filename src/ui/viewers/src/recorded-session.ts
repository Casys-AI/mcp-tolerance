/** Strict read-only envelope accepted from a recording host. */

import {
  TOLERANCE_RECORDED_SESSION_SCHEMAS,
  TOLERANCE_RESULT_SCHEMAS,
  TOLERANCE_UI_RESOURCE_URIS,
  type ToleranceViewKey,
} from "../../app-manifest.ts";

export interface ToleranceRecordedViewSession<TData> {
  readonly schemaVersion: typeof TOLERANCE_RECORDED_SESSION_SCHEMAS[
    ToleranceViewKey
  ];
  readonly resourceUri: typeof TOLERANCE_UI_RESOURCE_URIS[ToleranceViewKey];
  readonly resultSchema: string;
  readonly readOnly: true;
  readonly basis: {
    readonly projectId: string;
    readonly projectRevision: number;
    readonly subjectId: string;
    readonly thread: { readonly id: string; readonly revision: number };
    readonly artifact: { readonly id: string; readonly fingerprint: string };
  };
  readonly projectionFingerprint: string;
  readonly structuredContent: TData;
}

/** Synchronous structural gate installed before the App connects to its host. */
export function isToleranceRecordedViewSession<TData>(
  view: ToleranceViewKey,
  value: unknown,
  validateContent: (value: unknown) => value is TData,
): value is ToleranceRecordedViewSession<TData> {
  if (
    !isExactRecord(value, [
      "schemaVersion",
      "resourceUri",
      "resultSchema",
      "readOnly",
      "basis",
      "projectionFingerprint",
      "structuredContent",
    ]) ||
    value.schemaVersion !== TOLERANCE_RECORDED_SESSION_SCHEMAS[view] ||
    value.resourceUri !== TOLERANCE_UI_RESOURCE_URIS[view] ||
    typeof value.resultSchema !== "string" ||
    !(TOLERANCE_RESULT_SCHEMAS[view] as readonly string[]).includes(
      value.resultSchema,
    ) ||
    value.readOnly !== true ||
    !isSha256Fingerprint(value.projectionFingerprint) ||
    !isRecordedBasis(value.basis) ||
    !validateContent(value.structuredContent)
  ) return false;
  return true;
}

/** Verify the full projection digest before exposing recorded structured data. */
export async function parseToleranceRecordedViewSession<TData>(
  view: ToleranceViewKey,
  value: unknown,
  validateContent: (value: unknown) => value is TData,
): Promise<ToleranceRecordedViewSession<TData> | undefined> {
  if (!isToleranceRecordedViewSession(view, value, validateContent)) {
    return undefined;
  }
  let projectionFingerprint: string;
  try {
    projectionFingerprint = await fingerprintToleranceRecordedProjection({
      schemaVersion: value.schemaVersion,
      resourceUri: value.resourceUri,
      resultSchema: value.resultSchema,
      readOnly: true,
      basis: value.basis,
      structuredContent: value.structuredContent,
    });
  } catch {
    return undefined;
  }
  if (projectionFingerprint !== value.projectionFingerprint) return undefined;
  return deepFreeze(
    structuredClone(value),
  ) as ToleranceRecordedViewSession<TData>;
}

/** Digest the complete read model, excluding only its own digest field. */
export async function fingerprintToleranceRecordedProjection<TData>(
  value: Omit<ToleranceRecordedViewSession<TData>, "projectionFingerprint">,
): Promise<`sha256:${string}`> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

function isRecordedBasis(value: unknown): boolean {
  return isExactRecord(value, [
    "projectId",
    "projectRevision",
    "subjectId",
    "thread",
    "artifact",
  ]) &&
    isNonEmptyString(value.projectId) &&
    isRevision(value.projectRevision) &&
    isNonEmptyString(value.subjectId) &&
    isExactRecord(value.thread, ["id", "revision"]) &&
    isNonEmptyString(value.thread.id) &&
    isRevision(value.thread.revision) &&
    isExactRecord(value.artifact, ["id", "fingerprint"]) &&
    isNonEmptyString(value.artifact.id) &&
    isSha256Fingerprint(value.artifact.fingerprint);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isSha256Fingerprint(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isDenseJsonArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || !keys.includes("length")) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
}

function canonicalJson(value: unknown): string {
  if (
    value === null || typeof value === "string" ||
    typeof value === "boolean"
  ) return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (!isDenseJsonArray(value)) {
      throw new TypeError("Recorded tolerance arrays must be dense and unadorned");
    }
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    const members = Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",");
    return `{${members}}`;
  }
  throw new TypeError(
    "Recorded tolerance projections must contain JSON values only",
  );
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}
