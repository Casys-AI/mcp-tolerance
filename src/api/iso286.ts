/**
 * ISO 286-1:2010 fundamental tolerance and deviation engine.
 *
 * Provenance: "ISO 286-1:2010 §B.2 (tolerance factor i and IT grades 5–18),
 * Table 1 (IT grades 1–4), §B.3 (fundamental deviation formulas for letters
 * d/e/f/g/h/n), Table 3 (tabulated deviations for letters m/p/s/u)."
 *
 * Cross-validation (nominal 25 mm, range 18–30, D = 23.238 mm):
 *   i   = 0.45 × 23.238^(1/3) + 0.001 × 23.238 = 1.304 µm
 *   IT7 = 16 × 1.304 = 20.87 → 21 µm  ✓  (Table 1 value)
 *   IT6 = 10 × 1.304 = 13.04 → 13 µm  ✓
 *   es_g = −2.5 × 23.238^0.34 = −2.5 × 2.913 = −7.28 → −7 µm  ✓
 *   → H7/g6: hole 0/+21, shaft −7/−20, clearance 7–41 µm         ✓
 *   ei_p(table,18-30) = +22 µm → H7/p6: shaft +22/+35, interference 1–35 µm ✓
 *
 * No verdict — this engine computes tolerance limits; the caller assesses
 * fit suitability for the application.
 *
 * @module
 */

// ── Diameter ranges ────────────────────────────────────────────────────────

/**
 * Nominal diameter ranges in mm: [lower exclusive, upper inclusive].
 * ISO 286-1:2010 §4.2, 13 main ranges for up to 500 mm.
 */
export const DIAMETER_RANGES: readonly [number, number][] = [
  [0, 3],
  [3, 6],
  [6, 10],
  [10, 18],
  [18, 30],
  [30, 50],
  [50, 80],
  [80, 120],
  [120, 180],
  [180, 250],
  [250, 315],
  [315, 400],
  [400, 500],
] as const;

/**
 * Find the diameter range index for a nominal size.
 * @throws {RangeError} if diameter is outside (0, 500] mm.
 */
export function findRangeIndex(diameterMm: number): number {
  for (let i = 0; i < DIAMETER_RANGES.length; i++) {
    const [lo, hi] = DIAMETER_RANGES[i];
    if (diameterMm > lo && diameterMm <= hi) return i;
  }
  throw new RangeError(
    `Nominal diameter ${diameterMm} mm is outside (0, 500] mm — ` +
      `the range supported by ISO 286-1:2010.`,
  );
}

/**
 * Geometric mean D of the range (mm).
 * For range (0, 3] the lower limit is taken as 1 mm per ISO 286-1:2010 §B.2.
 */
export function geometricMean(rangeIndex: number): number {
  const [lo, hi] = DIAMETER_RANGES[rangeIndex];
  const lower = lo === 0 ? 1 : lo;
  return Math.sqrt(lower * hi);
}

// ── Tolerance factor and IT grades ────────────────────────────────────────

/**
 * Tolerance factor i in µm.
 * ISO 286-1:2010 §B.2 equation (B.1): i = 0.45 × D^(1/3) + 0.001 × D.
 * D in mm, i in µm.
 */
export function toleranceFactor(D_mm: number): number {
  return 0.45 * Math.pow(D_mm, 1 / 3) + 0.001 * D_mm;
}

/** Multiplier on i for IT grades 5–18. Source: ISO 286-1:2010 Table B.1. */
const IT_MULTIPLIERS: ReadonlyMap<number, number> = new Map([
  [5, 7],
  [6, 10],
  [7, 16],
  [8, 25],
  [9, 40],
  [10, 64],
  [11, 100],
  [12, 160],
  [13, 250],
  [14, 400],
  [15, 640],
  [16, 1000],
  [17, 1600],
  [18, 2500],
]);

/**
 * IT grades 1–4 tabulated in µm, indexed by range index 0–12.
 * Columns: [IT1, IT2, IT3, IT4].
 * Source: ISO 286-1:2010 Table 1.
 */
const IT1_TO_4_TABLE: readonly [number, number, number, number][] = [
  [0.8, 1.2, 2, 3], //  0–3
  [1, 1.5, 2.5, 4], //  3–6
  [1, 1.5, 2.5, 4], //  6–10
  [1.2, 2, 3, 5], // 10–18
  [1.5, 2.5, 4, 6], // 18–30
  [1.5, 2.5, 4, 7], // 30–50
  [2, 3, 5, 8], // 50–80
  [2.5, 4, 6, 10], // 80–120
  [3.5, 5, 8, 12], // 120–180
  [4.5, 7, 10, 14], // 180–250
  [6, 8, 12, 16], // 250–315
  [7, 9, 13, 18], // 315–400
  [8, 10, 15, 20], // 400–500
];

/**
 * Round a computed IT value to the ISO 286-1 standard series.
 *
 * ISO 286-1:2010 §B.2 specifies tiered rounding:
 *   value < 100 µm  → round to nearest 1 µm
 *   100 ≤ value < 1000 µm → round to nearest 10 µm
 *   value ≥ 1000 µm → round to nearest 100 µm
 *
 * Validation:
 *   IT11@25mm: 100×1.307=130.7 → round10 = 130 µm (Table 1 ✓)
 *   IT10@25mm: 64×1.307=83.7   → round1  =  84 µm (Table 1 ✓)
 *   IT16@25mm: 1000×1.307=1307 → round100= 1300 µm (Table 1 ✓)
 */
function roundIT(value: number): number {
  if (value < 100) return Math.round(value);
  if (value < 1000) return Math.round(value / 10) * 10;
  return Math.round(value / 100) * 100;
}

/**
 * Compute the fundamental tolerance IT in µm.
 *
 * Grades 1–4 are from ISO 286-1:2010 Table 1 (tabulated).
 * Grades 5–18 use formula: IT = multiplier × i, with ISO tiered rounding.
 *
 * @param grade  IT grade number 1–18.
 * @param diameterMm  Nominal diameter in mm, in (0, 500].
 */
export function fundamentalTolerance(grade: number, diameterMm: number): number {
  if (!Number.isInteger(grade) || grade < 1 || grade > 18) {
    throw new RangeError(
      `IT grade must be an integer 1–18; got ${grade}.`,
    );
  }
  const ri = findRangeIndex(diameterMm);
  if (grade <= 4) {
    return IT1_TO_4_TABLE[ri][grade - 1];
  }
  const D = geometricMean(ri);
  const i = toleranceFactor(D);
  return roundIT(IT_MULTIPLIERS.get(grade)! * i);
}

// ── Fundamental deviations ────────────────────────────────────────────────

/**
 * Shaft deviation result.
 * es = upper deviation (µm), ei = lower deviation (µm).
 * For clearance letters: es < 0, ei = es − IT.
 * For reference h: es = 0.
 * For transition/interference: ei > 0, es = ei + IT.
 */
export interface ShaftDeviations {
  /** Upper deviation in µm. */
  es_um: number;
  /** Lower deviation in µm. */
  ei_um: number;
}

/**
 * Hole deviation result.
 * EI = lower deviation (µm), ES = upper deviation (µm).
 * For H: EI = 0, ES = IT.
 */
export interface HoleDeviations {
  /** Lower deviation in µm. */
  EI_um: number;
  /** Upper deviation in µm. */
  ES_um: number;
}

// ── Clearance shaft formulas (ISO 286-1:2010 §B.3, Table B.2) ────────────

type ClearanceFormula = (D: number) => number; // returns es in µm

/**
 * Fundamental deviation formulas for clearance shaft letters a–h.
 * Argument D is the geometric mean of the range (mm).
 * Result is the upper deviation es in µm (negative for a–g, zero for h).
 *
 * Source: ISO 286-1:2010 §B.3, formulas B.3–B.8.
 * Validated for the 18–30 mm range:
 *   g: −2.5 × 23.238^0.34 = −7.28 → −7 µm  ✓
 *   f: −5.5 × 23.238^0.41 = −20.0 → −20 µm  ✓
 *   e: −11  × 23.238^0.41 = −40.0 → −40 µm  ✓
 *   d: −16  × 23.238^0.44 = −63.8 → −64 µm
 */
const CLEARANCE_SHAFT_ES: ReadonlyMap<string, ClearanceFormula> = new Map([
  ["h", (_D: number) => 0],
  ["g", (D: number) => -(2.5 * Math.pow(D, 0.34))],
  ["f", (D: number) => -(5.5 * Math.pow(D, 0.41))],
  ["e", (D: number) => -(11 * Math.pow(D, 0.41))],
  ["d", (D: number) => -(16 * Math.pow(D, 0.44))],
]);

// ── Transition/interference shaft tables (ISO 286-1:2010 Table 3) ─────────

/**
 * Lower deviation ei in µm for transition/interference shaft letters.
 * Index: range index 0–12.
 * Source: ISO 286-1:2010 Table 3.
 *
 * k: ei = 0 for IT ≤ 8 when D > 3 mm (ISO 286-1:2010 Table B.3 note).
 *    For D ≤ 3 mm (range 0): ei = +2 µm.
 */
const SHAFT_EI_TABLE: ReadonlyMap<string, readonly number[]> = new Map([
  // k: 0 for D > 3; +2 for D ≤ 3
  ["k", [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  // m: ISO 286-1:2010 Table 3
  ["m", [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23]],
  // p: ISO 286-1:2010 Table 3 — validated: 18–30 = 22 µm ✓
  ["p", [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]],
  // s: ISO 286-1:2010 Table 3
  ["s", [14, 19, 23, 28, 35, 43, 53, 59, 71, 79, 92, 100, 108]],
  // u: ISO 286-1:2010 Table 3
  ["u", [18, 23, 28, 33, 41, 48, 60, 70, 87, 102, 122, 139, 159]],
]);

/**
 * Lower deviation ei for n shaft (formula-based for D > 3 mm).
 * Formula: ei_n = round(5 × D^0.34)  — ISO 286-1:2010 §B.3.
 * For D ≤ 3 mm: ei = +4 µm (table fallback).
 * Validated: 18–30 mm → 5 × 2.913 = 14.57 → 15 µm.
 */
function nShaftEi(rangeIndex: number): number {
  if (rangeIndex === 0) return 4; // D ≤ 3: table value
  const D = geometricMean(rangeIndex);
  return Math.round(5 * Math.pow(D, 0.34));
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Letters supported for shaft fundamental deviation computation. */
export const SUPPORTED_SHAFT_LETTERS = [
  "d",
  "e",
  "f",
  "g",
  "h",
  "js",
  "k",
  "m",
  "n",
  "p",
  "s",
  "u",
] as const;
export type ShaftLetter = (typeof SUPPORTED_SHAFT_LETTERS)[number];

/**
 * Compute shaft deviations (es, ei) in µm for a given letter, IT grade, and
 * nominal diameter.
 *
 * @param letter  Shaft tolerance letter (lowercase). Must be one of
 *                SUPPORTED_SHAFT_LETTERS.
 * @param grade   IT grade number (1–18).
 * @param diameterMm  Nominal diameter in mm (0, 500].
 */
export function shaftDeviations(
  letter: string,
  grade: number,
  diameterMm: number,
): ShaftDeviations {
  const ri = findRangeIndex(diameterMm);
  const IT = fundamentalTolerance(grade, diameterMm);

  // js: symmetric tolerance ±IT/2
  if (letter === "js") {
    const half = IT / 2;
    return { es_um: Math.ceil(half), ei_um: -Math.floor(half) };
  }

  // Clearance letters d, e, f, g, h
  const clearanceFormula = CLEARANCE_SHAFT_ES.get(letter);
  if (clearanceFormula !== undefined) {
    const D = geometricMean(ri);
    const es = Math.round(clearanceFormula(D));
    return { es_um: es, ei_um: es - IT };
  }

  // n (formula)
  if (letter === "n") {
    const ei = nShaftEi(ri);
    return { ei_um: ei, es_um: ei + IT };
  }

  // k, m, p, s, u (table)
  const table = SHAFT_EI_TABLE.get(letter);
  if (table !== undefined) {
    const ei = table[ri];
    return { ei_um: ei, es_um: ei + IT };
  }

  throw new TypeError(
    `Shaft letter '${letter}' is not supported. ` +
      `Supported: ${SUPPORTED_SHAFT_LETTERS.join(", ")}.`,
  );
}

/** Letters supported for hole fundamental deviation computation. */
export const SUPPORTED_HOLE_LETTERS = ["H"] as const;
export type HoleLetter = (typeof SUPPORTED_HOLE_LETTERS)[number];

/**
 * Compute hole deviations (EI, ES) in µm for a given letter, IT grade, and
 * nominal diameter.
 *
 * @param letter  Hole tolerance letter (uppercase). Currently only "H" is
 *                implemented (EI = 0), which covers the vast majority of
 *                industrial clearance and transition fits.
 * @param grade   IT grade number (1–18).
 * @param diameterMm  Nominal diameter in mm (0, 500].
 */
export function holeDeviations(
  letter: string,
  grade: number,
  diameterMm: number,
): HoleDeviations {
  findRangeIndex(diameterMm); // validate range
  const IT = fundamentalTolerance(grade, diameterMm);

  if (letter === "H") {
    // H: fundamental deviation = 0 (EI = 0)
    return { EI_um: 0, ES_um: IT };
  }

  throw new TypeError(
    `Hole letter '${letter}' is not supported. ` +
      `Supported: ${SUPPORTED_HOLE_LETTERS.join(", ")}.`,
  );
}

// ── Fit result ─────────────────────────────────────────────────────────────

export type FitType = "clearance" | "transition" | "interference";

export interface FitResult {
  /** ISO 286-1:2010 */
  provenance: string;
  nominal_diameter_mm: number;
  /** Diameter range used for computation, e.g. [18, 30]. */
  diameter_range_mm: [number, number];
  hole: {
    letter: string;
    grade: number;
    EI_um: number;
    ES_um: number;
    IT_um: number;
    designation: string;
  };
  shaft: {
    letter: string;
    grade: number;
    ei_um: number;
    es_um: number;
    IT_um: number;
    designation: string;
  };
  fit: {
    /**
     * Fit type.
     * "clearance": shaft is always smaller than hole (all combinations).
     * "interference": shaft is always larger than hole.
     * "transition": fit can be clearance or interference depending on
     *   which actual parts are mated.
     */
    type: FitType;
    /**
     * Maximum clearance in µm (ES_hole − ei_shaft).
     * Positive means the hole is larger than the shaft.
     */
    max_clearance_um: number;
    /**
     * Maximum interference in µm (es_shaft − EI_hole).
     * Positive means the shaft is larger than the hole.
     */
    max_interference_um: number;
    /**
     * Minimum clearance in µm (EI_hole − es_shaft).
     * Positive for pure clearance fits; negative for transition/interference.
     */
    min_clearance_um: number;
    /**
     * Minimum interference in µm (ei_shaft − ES_hole).
     * Positive for pure interference fits; negative for clearance/transition.
     */
    min_interference_um: number;
  };
}

/**
 * Parse a tolerance designation like "H7" or "g6" into letter and grade.
 * Accepts multi-character letters (e.g. "js7", "JS7").
 */
export function parseDesignation(
  code: string,
): { letter: string; grade: number } {
  const match = code.match(/^([A-Za-z]{1,2})(\d+)$/);
  if (!match) {
    throw new TypeError(
      `Invalid tolerance designation '${code}'. ` +
        `Expected format: letter(s) followed by grade number, e.g. 'H7', 'g6', 'js9'.`,
    );
  }
  const [, letter, gradeStr] = match;
  const grade = parseInt(gradeStr, 10);
  if (grade < 1 || grade > 18) {
    throw new RangeError(
      `IT grade ${grade} in '${code}' is outside the range 1–18.`,
    );
  }
  return { letter, grade };
}

/**
 * Compute a complete fit result for a hole/shaft combination.
 *
 * @param holeCode   Hole tolerance designation, e.g. "H7".
 * @param shaftCode  Shaft tolerance designation, e.g. "g6".
 * @param diameterMm Nominal diameter in mm (0, 500].
 *
 * Provenance: ISO 286-1:2010 formulas/tables.
 */
export function computeFit(
  holeCode: string,
  shaftCode: string,
  diameterMm: number,
): FitResult {
  const hParsed = parseDesignation(holeCode);
  const sParsed = parseDesignation(shaftCode);

  // Validate: hole must be uppercase, shaft lowercase (or js)
  const holeLetter = hParsed.letter;
  const shaftLetter = sParsed.letter.toLowerCase();

  if (holeLetter !== holeLetter.toUpperCase()) {
    throw new TypeError(
      `Hole letter must be uppercase; got '${holeLetter}'. ` +
        `Example: 'H7', not 'h7'.`,
    );
  }
  if (sParsed.letter !== shaftLetter) {
    throw new TypeError(
      `Shaft letter must be lowercase; got '${sParsed.letter}'. ` +
        `Example: 'g6', not 'G6'.`,
    );
  }

  const ri = findRangeIndex(diameterMm);
  const range = DIAMETER_RANGES[ri];

  const hole = holeDeviations(holeLetter, hParsed.grade, diameterMm);
  const shaft = shaftDeviations(shaftLetter, sParsed.grade, diameterMm);

  const hIT = fundamentalTolerance(hParsed.grade, diameterMm);
  const sIT = fundamentalTolerance(sParsed.grade, diameterMm);

  // Clearance = hole diameter − shaft diameter (positive = clearance)
  const maxClearance = hole.ES_um - shaft.ei_um; // widest combination
  const minClearance = hole.EI_um - shaft.es_um; // tightest combination

  // Interference = shaft diameter − hole diameter (positive = interference)
  const maxInterference = shaft.es_um - hole.EI_um;
  const minInterference = shaft.ei_um - hole.ES_um;

  let fitType: FitType;
  if (minClearance >= 0) {
    fitType = "clearance";
  } else if (maxClearance <= 0) {
    fitType = "interference";
  } else {
    fitType = "transition";
  }

  return {
    provenance: "ISO 286-1:2010 formulas/tables",
    nominal_diameter_mm: diameterMm,
    diameter_range_mm: [range[0], range[1]],
    hole: {
      letter: holeLetter,
      grade: hParsed.grade,
      EI_um: hole.EI_um,
      ES_um: hole.ES_um,
      IT_um: hIT,
      designation: holeCode,
    },
    shaft: {
      letter: shaftLetter,
      grade: sParsed.grade,
      ei_um: shaft.ei_um,
      es_um: shaft.es_um,
      IT_um: sIT,
      designation: shaftCode,
    },
    fit: {
      type: fitType,
      max_clearance_um: maxClearance,
      min_clearance_um: minClearance,
      max_interference_um: maxInterference,
      min_interference_um: minInterference,
    },
  };
}
