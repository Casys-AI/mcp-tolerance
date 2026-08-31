/** Closed parsers and deterministic presentation models for tool results. */

import {
  capList,
  CONTRIBUTOR_CAP,
  formatNumber,
  formatRangeMm,
  formatSignedNumber,
  NOT_CHECKED_CAP,
  omittedLabel,
  UNIT_MM,
  UNIT_UM,
} from "./format.ts";

export type FitType = "clearance" | "transition" | "interference";
export type DesignationType = "hole" | "shaft";

export interface LimitsResult {
  readonly violations: readonly string[];
  readonly provenance: string;
  readonly designation: string;
  readonly designation_type: DesignationType;
  readonly nominal_diameter_mm: number;
  readonly diameter_range_mm: readonly [number, number];
  readonly it_grade: number;
  readonly IT_um: number;
  readonly fundamental_deviation_um: number;
  readonly upper_um: number;
  readonly lower_um: number;
  readonly not_checked: readonly string[];
}

export interface ItResult {
  readonly violations: readonly string[];
  readonly provenance: string;
  readonly grade: number;
  readonly nominal_diameter_mm: number;
  readonly diameter_range_mm: readonly [number, number];
  readonly IT_um: number;
  readonly not_checked: readonly string[];
}

export type LimitsViewerData = LimitsResult | ItResult;

export interface FitMember {
  readonly designation: string;
  readonly letter: string;
  readonly grade: number;
  readonly IT_um: number;
}

export interface FitHole extends FitMember {
  readonly EI_um: number;
  readonly ES_um: number;
}

export interface FitShaft extends FitMember {
  readonly ei_um: number;
  readonly es_um: number;
}

export interface FitResult {
  readonly violations: readonly string[];
  readonly provenance: string;
  readonly nominal_diameter_mm: number;
  readonly diameter_range_mm: readonly [number, number];
  readonly hole: FitHole;
  readonly shaft: FitShaft;
  readonly fit: {
    readonly type: FitType;
    readonly max_clearance_um: number;
    readonly min_clearance_um: number;
    readonly max_interference_um: number;
    readonly min_interference_um: number;
  };
  readonly not_checked: readonly string[];
}

export interface FitAnalyzeResult {
  readonly violations: readonly string[];
  readonly provenance: string;
  readonly nominal_diameter_mm: number;
  readonly diameter_range_mm: readonly [number, number];
  readonly hole: FitHole;
  readonly shaft: FitShaft;
  readonly clearance_min_um: number;
  readonly clearance_max_um: number;
  readonly fit_type: FitType;
  readonly not_checked: readonly string[];
}

export type FitViewerData = FitResult | FitAnalyzeResult;

export interface StackupContributor {
  readonly name: string;
  readonly signed_nominal_mm: number;
  readonly worst_case_upper_excursion_mm: number;
  readonly worst_case_lower_excursion_mm: number;
  readonly rss_upper_sq_mm2: number;
  readonly rss_lower_sq_mm2: number;
}

export interface StackupResult {
  readonly violations: readonly string[];
  readonly provenance: string;
  readonly nominal_mm: number;
  readonly contributor_count: number;
  readonly worst_case_min_mm: number;
  readonly worst_case_max_mm: number;
  readonly rss_min_mm: number;
  readonly rss_max_mm: number;
  readonly contributor_breakdown: readonly StackupContributor[];
  readonly not_checked: readonly string[];
}

export interface MetricView {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}

export interface FactView {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface BadgeView {
  readonly label: string;
  readonly tone: "neutral";
}

export interface ResultCardView {
  readonly title: string;
  readonly eyebrow: string;
  readonly badge?: BadgeView;
  readonly metrics: readonly MetricView[];
  readonly facts: readonly FactView[];
  readonly provenance: string;
}

export interface CappedNotes {
  readonly items: readonly string[];
  readonly omitted: number;
  readonly omittedLabel?: string;
}

export interface ContributorTableView {
  readonly columns: readonly [
    "name",
    "signed_nominal_mm",
    "worst_case_upper_excursion_mm",
    "worst_case_lower_excursion_mm",
    "rss_upper_sq_mm2",
    "rss_lower_sq_mm2",
  ];
  readonly rows: readonly {
    readonly id: string;
    readonly name: string;
    readonly signed_nominal_mm: string;
    readonly worst_case_upper_excursion_mm: string;
    readonly worst_case_lower_excursion_mm: string;
    readonly rss_upper_sq_mm2: string;
    readonly rss_lower_sq_mm2: string;
  }[];
  readonly omitted: number;
  readonly omittedLabel?: string;
}

const LIMITS_KEYS = [
  "violations",
  "provenance",
  "designation",
  "designation_type",
  "nominal_diameter_mm",
  "diameter_range_mm",
  "it_grade",
  "IT_um",
  "fundamental_deviation_um",
  "upper_um",
  "lower_um",
  "not_checked",
] as const;

const IT_KEYS = [
  "violations",
  "provenance",
  "grade",
  "nominal_diameter_mm",
  "diameter_range_mm",
  "IT_um",
  "not_checked",
] as const;

const FIT_KEYS = [
  "violations",
  "provenance",
  "nominal_diameter_mm",
  "diameter_range_mm",
  "hole",
  "shaft",
  "fit",
  "not_checked",
] as const;

const FIT_ANALYZE_KEYS = [
  "violations",
  "provenance",
  "nominal_diameter_mm",
  "diameter_range_mm",
  "hole",
  "shaft",
  "clearance_min_um",
  "clearance_max_um",
  "fit_type",
  "not_checked",
] as const;

const STACKUP_KEYS = [
  "violations",
  "provenance",
  "nominal_mm",
  "contributor_count",
  "worst_case_min_mm",
  "worst_case_max_mm",
  "rss_min_mm",
  "rss_max_mm",
  "contributor_breakdown",
  "not_checked",
] as const;

const HOLE_KEYS = [
  "designation",
  "letter",
  "grade",
  "EI_um",
  "ES_um",
  "IT_um",
] as const;

const SHAFT_KEYS = [
  "designation",
  "letter",
  "grade",
  "ei_um",
  "es_um",
  "IT_um",
] as const;

const FIT_INTERVAL_KEYS = [
  "type",
  "max_clearance_um",
  "min_clearance_um",
  "max_interference_um",
  "min_interference_um",
] as const;

const CONTRIBUTOR_KEYS = [
  "name",
  "signed_nominal_mm",
  "worst_case_upper_excursion_mm",
  "worst_case_lower_excursion_mm",
  "rss_upper_sq_mm2",
  "rss_lower_sq_mm2",
] as const;

export function parseLimitsResult(value: unknown): LimitsResult {
  const root = exactRecord(value, LIMITS_KEYS, "tolerance_limits");
  const designation_type = literalUnion(
    root.designation_type,
    ["hole", "shaft"] as const,
    "designation_type",
  );
  return {
    violations: stringList(root.violations, "violations"),
    provenance: nonEmptyString(root.provenance, "provenance"),
    designation: nonEmptyString(root.designation, "designation"),
    designation_type,
    nominal_diameter_mm: finiteNumber(
      root.nominal_diameter_mm,
      "nominal_diameter_mm",
    ),
    diameter_range_mm: diameterRange(root.diameter_range_mm),
    it_grade: integer(root.it_grade, "it_grade"),
    IT_um: finiteNumber(root.IT_um, "IT_um"),
    fundamental_deviation_um: finiteNumber(
      root.fundamental_deviation_um,
      "fundamental_deviation_um",
    ),
    upper_um: finiteNumber(root.upper_um, "upper_um"),
    lower_um: finiteNumber(root.lower_um, "lower_um"),
    not_checked: stringList(root.not_checked, "not_checked"),
  };
}

export function parseItResult(value: unknown): ItResult {
  const root = exactRecord(value, IT_KEYS, "tolerance_it");
  return {
    violations: stringList(root.violations, "violations"),
    provenance: nonEmptyString(root.provenance, "provenance"),
    grade: integer(root.grade, "grade"),
    nominal_diameter_mm: finiteNumber(
      root.nominal_diameter_mm,
      "nominal_diameter_mm",
    ),
    diameter_range_mm: diameterRange(root.diameter_range_mm),
    IT_um: finiteNumber(root.IT_um, "IT_um"),
    not_checked: stringList(root.not_checked, "not_checked"),
  };
}

export function parseFitResult(value: unknown): FitResult {
  const root = exactRecord(value, FIT_KEYS, "tolerance_fit");
  const fit = exactRecord(root.fit, FIT_INTERVAL_KEYS, "fit");
  return {
    violations: stringList(root.violations, "violations"),
    provenance: nonEmptyString(root.provenance, "provenance"),
    nominal_diameter_mm: finiteNumber(
      root.nominal_diameter_mm,
      "nominal_diameter_mm",
    ),
    diameter_range_mm: diameterRange(root.diameter_range_mm),
    hole: parseHole(root.hole),
    shaft: parseShaft(root.shaft),
    fit: {
      type: fitType(fit.type),
      max_clearance_um: finiteNumber(
        fit.max_clearance_um,
        "fit.max_clearance_um",
      ),
      min_clearance_um: finiteNumber(
        fit.min_clearance_um,
        "fit.min_clearance_um",
      ),
      max_interference_um: finiteNumber(
        fit.max_interference_um,
        "fit.max_interference_um",
      ),
      min_interference_um: finiteNumber(
        fit.min_interference_um,
        "fit.min_interference_um",
      ),
    },
    not_checked: stringList(root.not_checked, "not_checked"),
  };
}

export function parseFitAnalyzeResult(value: unknown): FitAnalyzeResult {
  const root = exactRecord(value, FIT_ANALYZE_KEYS, "tolerance_fit_analyze");
  return {
    violations: stringList(root.violations, "violations"),
    provenance: nonEmptyString(root.provenance, "provenance"),
    nominal_diameter_mm: finiteNumber(
      root.nominal_diameter_mm,
      "nominal_diameter_mm",
    ),
    diameter_range_mm: diameterRange(root.diameter_range_mm),
    hole: parseHole(root.hole),
    shaft: parseShaft(root.shaft),
    clearance_min_um: finiteNumber(root.clearance_min_um, "clearance_min_um"),
    clearance_max_um: finiteNumber(root.clearance_max_um, "clearance_max_um"),
    fit_type: fitType(root.fit_type),
    not_checked: stringList(root.not_checked, "not_checked"),
  };
}

export function parseStackupResult(value: unknown): StackupResult {
  const root = exactRecord(value, STACKUP_KEYS, "tolerance_stackup");
  const contributor_breakdown = denseArray(
    root.contributor_breakdown,
    "contributor_breakdown",
  ).map((item, index) => parseContributor(item, index));
  const contributor_count = integer(
    root.contributor_count,
    "contributor_count",
  );
  if (contributor_count !== contributor_breakdown.length) {
    throw new TypeError(
      `contributor_count ${contributor_count} does not match breakdown length ${contributor_breakdown.length}.`,
    );
  }
  return {
    violations: stringList(root.violations, "violations"),
    provenance: nonEmptyString(root.provenance, "provenance"),
    nominal_mm: finiteNumber(root.nominal_mm, "nominal_mm"),
    contributor_count,
    worst_case_min_mm: finiteNumber(
      root.worst_case_min_mm,
      "worst_case_min_mm",
    ),
    worst_case_max_mm: finiteNumber(
      root.worst_case_max_mm,
      "worst_case_max_mm",
    ),
    rss_min_mm: finiteNumber(root.rss_min_mm, "rss_min_mm"),
    rss_max_mm: finiteNumber(root.rss_max_mm, "rss_max_mm"),
    contributor_breakdown,
    not_checked: stringList(root.not_checked, "not_checked"),
  };
}

export function isLimitsViewerData(value: unknown): value is LimitsViewerData {
  try {
    parseLimitsViewerData(value);
    return true;
  } catch {
    return false;
  }
}

export function isFitViewerData(value: unknown): value is FitViewerData {
  try {
    parseFitViewerData(value);
    return true;
  } catch {
    return false;
  }
}

export function isStackupViewerData(value: unknown): value is StackupResult {
  try {
    parseStackupResult(value);
    return true;
  } catch {
    return false;
  }
}

export function parseLimitsViewerData(value: unknown): LimitsViewerData {
  if (isRecord(value) && "designation" in value) {
    return parseLimitsResult(value);
  }
  return parseItResult(value);
}

export function parseFitViewerData(value: unknown): FitViewerData {
  if (isRecord(value) && "fit_type" in value) {
    return parseFitAnalyzeResult(value);
  }
  return parseFitResult(value);
}

export function presentLimits(data: LimitsResult): ResultCardView {
  return {
    title: data.designation,
    eyebrow: data.designation_type === "hole" ? "ISO 286-1 hole" : "ISO 286-1 shaft",
    badge: { label: data.designation_type, tone: "neutral" },
    metrics: [
      metric(
        "nominal",
        "Nominal",
        formatNumber(data.nominal_diameter_mm),
        UNIT_MM,
      ),
      metric(
        "lower",
        "Lower deviation",
        formatSignedNumber(data.lower_um),
        UNIT_UM,
      ),
      metric(
        "upper",
        "Upper deviation",
        formatSignedNumber(data.upper_um),
        UNIT_UM,
      ),
      metric("it", "IT", formatNumber(data.IT_um), UNIT_UM),
    ],
    facts: [
      {
        id: "range",
        label: "Diameter range",
        value: formatRangeMm(data.diameter_range_mm),
      },
      { id: "grade", label: "IT grade", value: formatNumber(data.it_grade) },
      {
        id: "fundamental",
        label: "Fundamental deviation",
        value: `${formatSignedNumber(data.fundamental_deviation_um)} ${UNIT_UM}`,
      },
    ],
    provenance: data.provenance,
  };
}

export function presentIt(data: ItResult): ResultCardView {
  return {
    title: `IT${formatNumber(data.grade)}`,
    eyebrow: "ISO 286-1 fundamental tolerance",
    metrics: [
      metric(
        "nominal",
        "Nominal",
        formatNumber(data.nominal_diameter_mm),
        UNIT_MM,
      ),
      metric("it", "IT", formatNumber(data.IT_um), UNIT_UM),
    ],
    facts: [
      {
        id: "range",
        label: "Diameter range",
        value: formatRangeMm(data.diameter_range_mm),
      },
    ],
    provenance: data.provenance,
  };
}

export function presentLimitsViewer(data: LimitsViewerData): ResultCardView {
  return "designation" in data ? presentLimits(data) : presentIt(data);
}

export function presentFit(data: FitResult): ResultCardView {
  return {
    title: `${data.hole.designation}/${data.shaft.designation}`,
    eyebrow: "ISO 286-1 hole/shaft fit",
    badge: { label: data.fit.type, tone: "neutral" },
    metrics: [
      metric(
        "nominal",
        "Nominal",
        formatNumber(data.nominal_diameter_mm),
        UNIT_MM,
      ),
      metric(
        "min-clearance",
        "Minimum clearance",
        formatNumber(data.fit.min_clearance_um),
        UNIT_UM,
      ),
      metric(
        "max-clearance",
        "Maximum clearance",
        formatNumber(data.fit.max_clearance_um),
        UNIT_UM,
      ),
      metric(
        "min-interference",
        "Minimum interference",
        formatNumber(data.fit.min_interference_um),
        UNIT_UM,
      ),
      metric(
        "max-interference",
        "Maximum interference",
        formatNumber(data.fit.max_interference_um),
        UNIT_UM,
      ),
    ],
    facts: [
      {
        id: "range",
        label: "Diameter range",
        value: formatRangeMm(data.diameter_range_mm),
      },
    ],
    provenance: data.provenance,
  };
}

export function presentFitAnalyze(data: FitAnalyzeResult): ResultCardView {
  return {
    title: `${data.hole.designation}/${data.shaft.designation}`,
    eyebrow: "ISO 286-1 hole/shaft fit",
    badge: { label: data.fit_type, tone: "neutral" },
    metrics: [
      metric(
        "nominal",
        "Nominal",
        formatNumber(data.nominal_diameter_mm),
        UNIT_MM,
      ),
      metric(
        "min-clearance",
        "Minimum clearance",
        formatNumber(data.clearance_min_um),
        UNIT_UM,
      ),
      metric(
        "max-clearance",
        "Maximum clearance",
        formatNumber(data.clearance_max_um),
        UNIT_UM,
      ),
    ],
    facts: [
      {
        id: "range",
        label: "Diameter range",
        value: formatRangeMm(data.diameter_range_mm),
      },
    ],
    provenance: data.provenance,
  };
}

export function presentFitViewer(data: FitViewerData): ResultCardView {
  return "fit_type" in data ? presentFitAnalyze(data) : presentFit(data);
}

export function presentFitMembers(data: FitViewerData): readonly FactView[] {
  return [
    {
      id: "hole",
      label: `Hole ${data.hole.designation}`,
      value: `${formatSignedNumber(data.hole.EI_um)}/${
        formatSignedNumber(data.hole.ES_um)
      } ${UNIT_UM} · IT ${formatNumber(data.hole.IT_um)} ${UNIT_UM}`,
    },
    {
      id: "shaft",
      label: `Shaft ${data.shaft.designation}`,
      value: `${formatSignedNumber(data.shaft.ei_um)}/${
        formatSignedNumber(data.shaft.es_um)
      } ${UNIT_UM} · IT ${formatNumber(data.shaft.IT_um)} ${UNIT_UM}`,
    },
  ];
}

export function presentStackup(data: StackupResult): ResultCardView {
  return {
    title: "1D stack-up",
    eyebrow: `${formatNumber(data.contributor_count)} contributors`,
    metrics: [
      metric("nominal", "Nominal", formatNumber(data.nominal_mm), UNIT_MM),
      metric(
        "wc-min",
        "Worst-case min",
        formatNumber(data.worst_case_min_mm),
        UNIT_MM,
      ),
      metric(
        "wc-max",
        "Worst-case max",
        formatNumber(data.worst_case_max_mm),
        UNIT_MM,
      ),
      metric("rss-min", "RSS min", formatNumber(data.rss_min_mm), UNIT_MM),
      metric("rss-max", "RSS max", formatNumber(data.rss_max_mm), UNIT_MM),
    ],
    facts: [],
    provenance: data.provenance,
  };
}

export function presentStackupContributors(
  data: StackupResult,
): ContributorTableView {
  const capped = capList(data.contributor_breakdown, CONTRIBUTOR_CAP);
  return {
    columns: [
      "name",
      "signed_nominal_mm",
      "worst_case_upper_excursion_mm",
      "worst_case_lower_excursion_mm",
      "rss_upper_sq_mm2",
      "rss_lower_sq_mm2",
    ],
    rows: capped.items.map((item, index) => ({
      id: `${index}:${item.name}`,
      name: item.name,
      signed_nominal_mm: formatNumber(item.signed_nominal_mm),
      worst_case_upper_excursion_mm: formatNumber(
        item.worst_case_upper_excursion_mm,
      ),
      worst_case_lower_excursion_mm: formatNumber(
        item.worst_case_lower_excursion_mm,
      ),
      rss_upper_sq_mm2: formatNumber(item.rss_upper_sq_mm2),
      rss_lower_sq_mm2: formatNumber(item.rss_lower_sq_mm2),
    })),
    omitted: capped.omitted,
    omittedLabel: omittedLabel(capped.omitted, "contributors"),
  };
}

export function presentNotChecked(notes: readonly string[]): CappedNotes {
  const capped = capList(notes, NOT_CHECKED_CAP);
  return {
    items: capped.items,
    omitted: capped.omitted,
    omittedLabel: omittedLabel(capped.omitted, "not-checked items"),
  };
}

function parseHole(value: unknown): FitHole {
  const hole = exactRecord(value, HOLE_KEYS, "hole");
  return {
    designation: nonEmptyString(hole.designation, "hole.designation"),
    letter: nonEmptyString(hole.letter, "hole.letter"),
    grade: integer(hole.grade, "hole.grade"),
    EI_um: finiteNumber(hole.EI_um, "hole.EI_um"),
    ES_um: finiteNumber(hole.ES_um, "hole.ES_um"),
    IT_um: finiteNumber(hole.IT_um, "hole.IT_um"),
  };
}

function parseShaft(value: unknown): FitShaft {
  const shaft = exactRecord(value, SHAFT_KEYS, "shaft");
  return {
    designation: nonEmptyString(shaft.designation, "shaft.designation"),
    letter: nonEmptyString(shaft.letter, "shaft.letter"),
    grade: integer(shaft.grade, "shaft.grade"),
    ei_um: finiteNumber(shaft.ei_um, "shaft.ei_um"),
    es_um: finiteNumber(shaft.es_um, "shaft.es_um"),
    IT_um: finiteNumber(shaft.IT_um, "shaft.IT_um"),
  };
}

function parseContributor(value: unknown, index: number): StackupContributor {
  const item = exactRecord(
    value,
    CONTRIBUTOR_KEYS,
    `contributor_breakdown[${index}]`,
  );
  return {
    name: nonEmptyString(item.name, `contributor_breakdown[${index}].name`),
    signed_nominal_mm: finiteNumber(
      item.signed_nominal_mm,
      `contributor_breakdown[${index}].signed_nominal_mm`,
    ),
    worst_case_upper_excursion_mm: finiteNumber(
      item.worst_case_upper_excursion_mm,
      `contributor_breakdown[${index}].worst_case_upper_excursion_mm`,
    ),
    worst_case_lower_excursion_mm: finiteNumber(
      item.worst_case_lower_excursion_mm,
      `contributor_breakdown[${index}].worst_case_lower_excursion_mm`,
    ),
    rss_upper_sq_mm2: finiteNumber(
      item.rss_upper_sq_mm2,
      `contributor_breakdown[${index}].rss_upper_sq_mm2`,
    ),
    rss_lower_sq_mm2: finiteNumber(
      item.rss_lower_sq_mm2,
      `contributor_breakdown[${index}].rss_lower_sq_mm2`,
    ),
  };
}

function metric(
  id: string,
  label: string,
  value: string,
  unit: string,
): MetricView {
  return { id, label, value, unit };
}

function diameterRange(value: unknown): readonly [number, number] {
  const items = denseArray(value, "diameter_range_mm");
  if (items.length !== 2) {
    throw new TypeError("diameter_range_mm must contain exactly two numbers.");
  }
  return [
    finiteNumber(items[0], "diameter_range_mm[0]"),
    finiteNumber(items[1], "diameter_range_mm[1]"),
  ];
}

function fitType(value: unknown): FitType {
  return literalUnion(
    value,
    ["clearance", "transition", "interference"] as const,
    "fit type",
  );
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, i) => key !== expected[i])
  ) {
    throw new TypeError(`${label} has unsupported fields.`);
  }
  return value;
}

function denseArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (Object.keys(value).length !== value.length) {
    throw new TypeError(`${label} must be a dense, unadorned array.`);
  }
  return value;
}

function stringList(value: unknown, label: string): readonly string[] {
  return denseArray(value, label).map((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new TypeError(`${label}[${index}] must be a non-empty string.`);
    }
    return item;
  });
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new TypeError(`${label} must be an integer.`);
  }
  return number;
}

function literalUnion<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new TypeError(`${label} must be one of ${allowed.join(", ")}.`);
  }
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
