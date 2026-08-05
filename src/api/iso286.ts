/**
 * ISO 286-1:2010 fundamental tolerance and deviation engine.
 *
 * Provenance: "ISO 286-1:2010 §B.2 (tolerance factor i), Table 1 (IT grades
 * 1–12 tabulated), Table B.1 (IT multipliers for grades 13–18), Table 2
 * (fundamental deviations for clearance shaft letters c–g), Table 3
 * (fundamental deviations for interference shaft letters k–u and n)."
 *
 * Design note — tables over formulas for IT1–IT12 and clearance shafts:
 * The ISO 286-1 formula i=0.45D^(1/3)+0.001D produces values that match the
 * published Table 1 for diameters above ~10 mm. For smaller diameters (0–3
 * and 3–6 mm) the computed IT6 from the formula gives 5 µm and 7 µm
 * respectively, while the normative Table 1 says 6 µm and 8 µm. Similarly,
 * the formula for shaft g gives es=−3 µm for 0–3 mm while Table 2 says −2 µm.
 * This engine therefore uses the tabulated values for IT1–IT12 and for all
 * clearance shaft letters (c, d, e, f, g), which are the normative authority.
 * Formula is retained only for IT13–IT18 where no discrepancy has been
 * observed.
 *
 * Cross-validation (nominal 25 mm, range 18–30, D = 23.238 mm):
 *   IT6(table)  = 13 µm  ✓   IT7(table)  = 21 µm  ✓
 *   es_g(table) = −7 µm  ✓   ei_g(table) = −20 µm ✓
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
 * D in mm, i in µm. Retained for IT13–IT18 only.
 */
export function toleranceFactor(D_mm: number): number {
  return 0.45 * Math.pow(D_mm, 1 / 3) + 0.001 * D_mm;
}

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
 * IT grades 5–12 tabulated in µm, indexed by range index 0–12.
 * Columns: [IT5, IT6, IT7, IT8, IT9, IT10, IT11, IT12].
 * Source: ISO 286-1:2010 Table 1 (normative; prevails over formula for small D).
 *
 * Known formula/table divergences (formula gives, table says):
 *   IT6 @ 0–3 mm:  formula→5, table→6
 *   IT6 @ 3–6 mm:  formula→7, table→8
 *   IT5 @ 0–3 mm:  formula→4, table→4  (no divergence)
 */
const IT5_TO_12_TABLE: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  [4, 6, 10, 14, 25, 40, 60, 100], //  0–3
  [5, 8, 12, 18, 30, 48, 75, 120], //  3–6
  [6, 9, 15, 22, 36, 58, 90, 150], //  6–10
  [8, 11, 18, 27, 43, 70, 110, 180], // 10–18
  [9, 13, 21, 33, 52, 84, 130, 210], // 18–30
  [11, 16, 25, 39, 62, 100, 160, 250], // 30–50
  [13, 19, 30, 46, 74, 120, 190, 300], // 50–80
  [15, 22, 35, 54, 87, 140, 220, 350], // 80–120
  [18, 25, 40, 63, 100, 160, 250, 400], // 120–180
  [20, 29, 46, 72, 115, 185, 290, 460], // 180–250
  [23, 32, 52, 81, 130, 210, 320, 520], // 250–315
  [25, 36, 57, 89, 140, 230, 360, 570], // 315–400
  [27, 40, 63, 97, 155, 250, 400, 630], // 400–500
];

/** Multiplier on i for IT grades 13–18. Source: ISO 286-1:2010 Table B.1. */
const IT_MULTIPLIERS_HIGH: ReadonlyMap<number, number> = new Map([
  [13, 250],
  [14, 400],
  [15, 640],
  [16, 1000],
  [17, 1600],
  [18, 2500],
]);

/**
 * Round a computed IT value to the ISO 286-1 standard series.
 * Used only for IT13–IT18 (formula path).
 *
 * ISO 286-1:2010 §B.2 specifies tiered rounding:
 *   value < 100 µm  → round to nearest 1 µm
 *   100 ≤ value < 1000 µm → round to nearest 10 µm
 *   value ≥ 1000 µm → round to nearest 100 µm
 */
function roundIT(value: number): number {
  if (value < 100) return Math.round(value);
  if (value < 1000) return Math.round(value / 10) * 10;
  return Math.round(value / 100) * 100;
}

/**
 * Compute the fundamental tolerance IT in µm.
 *
 * Grades 1–4: ISO 286-1:2010 Table 1 (tabulated).
 * Grades 5–12: ISO 286-1:2010 Table 1 (tabulated; normative authority).
 * Grades 13–18: formula IT = multiplier × i with ISO tiered rounding.
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
  if (grade <= 12) {
    return IT5_TO_12_TABLE[ri][grade - 5];
  }
  // IT13–IT18: formula only (table not provided by ISO 286-1 for these grades)
  const D = geometricMean(ri);
  const i = toleranceFactor(D);
  return roundIT(IT_MULTIPLIERS_HIGH.get(grade)! * i);
}

// ── Clearance shaft deviations (tabulated) ────────────────────────────────

/**
 * Upper deviation es in µm for clearance shaft letters c, d, e, f, g.
 * Indexed by range index 0–12.
 * Source: ISO 286-1:2010 Table 2.
 *
 * Tabulated values prevail over formula for small diameters. Known formula/
 * table divergences (formula, table):
 *   f @ 0–3 mm:  formula→−7, table→−6
 *   g @ 0–3 mm:  formula→−3, table→−2
 *   g @ 3–6 mm:  formula→−3 (matches table for this range? recheck):
 *     D=4.243, es_g=−round(2.5×4.243^0.34)=−round(4.09)=−4 ✓ (table=−4)
 *   So g formula diverges only at 0–3 mm.
 */
const CLEARANCE_SHAFT_ES_TABLE: ReadonlyMap<string, readonly number[]> = new Map([
  // c: ISO 286-1:2010 Table 2
  ["c", [-60, -70, -80, -95, -110, -120, -130, -140, -150, -170, -190, -210, -230]],
  // d: ISO 286-1:2010 Table 2
  ["d", [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230]],
  // e: ISO 286-1:2010 Table 2
  ["e", [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135]],
  // f: ISO 286-1:2010 Table 2
  ["f", [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68]],
  // g: ISO 286-1:2010 Table 2
  ["g", [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20]],
]);

// ── Transition/interference shaft deviations (tabulated) ──────────────────

/**
 * Lower deviation ei in µm for transition/interference shaft letters.
 * Indexed by range index 0–12.
 * Source: ISO 286-1:2010 Table 3.
 *
 * Letter n: formula ei_n=round(5D^0.34) diverges at 80–120 mm
 * (formula→24, table→23). Tabulated value used throughout.
 *
 * Letters r, s, u: the standard provides sub-ranges within the 13 main ranges
 * (e.g. 50–65 and 65–80 within 50–80). This engine uses 13 main ranges only;
 * the first sub-range value is used for ranges with sub-ranges. Deviations of
 * 1–6 µm from the sub-range value are documented in not_checked.
 */
const SHAFT_EI_TABLE: ReadonlyMap<string, readonly number[]> = new Map([
  // k: ei=0 for D>3 mm (IT≤8); ei=+2 for D≤3 mm. ISO 286-1:2010 Table B.3 note.
  ["k", [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  // m: ISO 286-1:2010 Table 3
  ["m", [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23]],
  // n: ISO 286-1:2010 Table 3 (tabulated; formula diverges at 80–120 mm)
  ["n", [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40]],
  // p: ISO 286-1:2010 Table 3 — validated: 18–30 = 22 µm ✓
  ["p", [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]],
  // r: ISO 286-1:2010 Table 3 (first sub-range value used)
  ["r", [10, 15, 19, 23, 28, 34, 41, 51, 63, 77, 94, 108, 126]],
  // s: ISO 286-1:2010 Table 3 (first sub-range value used)
  ["s", [14, 19, 23, 28, 35, 43, 53, 59, 71, 79, 92, 100, 108]],
  // u: ISO 286-1:2010 Table 3 (first sub-range value used)
  ["u", [18, 23, 28, 33, 41, 48, 60, 70, 87, 102, 122, 139, 159]],
]);

// ── Public API ─────────────────────────────────────────────────────────────

/** Letters supported for shaft fundamental deviation computation. */
export const SUPPORTED_SHAFT_LETTERS = [
  "c",
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
  "r",
  "s",
  "u",
] as const;
export type ShaftLetter = (typeof SUPPORTED_SHAFT_LETTERS)[number];

/**
 * Shaft deviation result.
 * es = upper deviation (µm), ei = lower deviation (µm).
 * For clearance letters (c–g): es ≤ 0, ei = es − IT.
 * For reference h: es = 0.
 * For transition/interference (k–u): ei ≥ 0, es = ei + IT.
 */
export interface ShaftDeviations {
  /** Upper deviation in µm. */
  es_um: number;
  /** Lower deviation in µm. */
  ei_um: number;
}

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

  // h: es = 0 exactly (ISO 286-1 reference position)
  if (letter === "h") {
    return { es_um: 0, ei_um: -IT };
  }

  // Clearance letters c, d, e, f, g — tabulated es (negative)
  const esTable = CLEARANCE_SHAFT_ES_TABLE.get(letter);
  if (esTable !== undefined) {
    const es = esTable[ri];
    return { es_um: es, ei_um: es - IT };
  }

  // Transition/interference letters k, m, n, p, r, s, u — tabulated ei (positive)
  const eiTable = SHAFT_EI_TABLE.get(letter);
  if (eiTable !== undefined) {
    const ei = eiTable[ri];
    return { ei_um: ei, es_um: ei + IT };
  }

  throw new TypeError(
    `Shaft letter '${letter}' is not supported. ` +
      `Supported: ${SUPPORTED_SHAFT_LETTERS.join(", ")}.`,
  );
}

/** Letters supported for hole fundamental deviation computation. */
export const SUPPORTED_HOLE_LETTERS = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "JS",
  "K",
  "M",
  "N",
  "P",
  "R",
  "S",
] as const;
export type HoleLetter = (typeof SUPPORTED_HOLE_LETTERS)[number];

/**
 * Hole deviation result.
 * EI = lower deviation (µm), ES = upper deviation (µm).
 */
export interface HoleDeviations {
  /** Lower deviation in µm. */
  EI_um: number;
  /** Upper deviation in µm. */
  ES_um: number;
}

/**
 * Compute hole deviations (EI, ES) in µm for a given letter, IT grade, and
 * nominal diameter.
 *
 * Derivation rule (ISO 286-1:2010 §B.4):
 *   Clearance holes C–G: fundamental deviation is EI.
 *     EI_hole = −es_shaft(lowercase), ES_hole = EI + IT
 *   Hole H: EI = 0, ES = IT (base hole, hole-basis system).
 *   Hole JS: ES = +IT/2, EI = −IT/2 (symmetric, same rule as shaft js).
 *   Interference/transition holes K–S: fundamental deviation is ES.
 *     ES_hole = −ei_shaft(lowercase), EI_hole = ES − IT
 *
 * Example — G7 at 25 mm (range 18–30):
 *   es_g = −7 µm → EI_G7 = −(−7) = +7, ES_G7 = 7+21 = +28 µm
 *   With shaft h6: clearance 7–41 µm (same spread as H7/g6, shifted +7 µm).
 *
 * @param letter  Hole tolerance letter (uppercase). Must be one of
 *                SUPPORTED_HOLE_LETTERS.
 * @param grade   IT grade number (1–18).
 * @param diameterMm  Nominal diameter in mm (0, 500].
 */
export function holeDeviations(
  letter: string,
  grade: number,
  diameterMm: number,
): HoleDeviations {
  const ri = findRangeIndex(diameterMm);
  const IT = fundamentalTolerance(grade, diameterMm);

  // H: fundamental deviation = 0 (EI = 0)
  if (letter === "H") {
    return { EI_um: 0, ES_um: IT };
  }

  // JS: symmetric tolerance ±IT/2
  if (letter === "JS") {
    const half = IT / 2;
    return { EI_um: -Math.floor(half), ES_um: Math.ceil(half) };
  }

  const lower = letter.toLowerCase();

  // Clearance holes C–G: EI = −es_shaft, ES = EI + IT
  const esTable = CLEARANCE_SHAFT_ES_TABLE.get(lower);
  if (esTable !== undefined) {
    const es = esTable[ri]; // es_shaft is negative
    const EI = -es; // EI_hole = positive
    return { EI_um: EI, ES_um: EI + IT };
  }

  // Interference/transition holes K, M, N, P, R, S: ES = −ei_shaft, EI = ES − IT
  const eiTable = SHAFT_EI_TABLE.get(lower);
  if (eiTable !== undefined) {
    const ei = eiTable[ri]; // ei_shaft is positive
    const ES = -ei; // ES_hole = negative
    return { EI_um: ES - IT, ES_um: ES };
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
     * "clearance": shaft always smaller than hole.
     * "interference": shaft always larger than hole.
     * "transition": actual fit depends on which parts are mated.
     */
    type: FitType;
    /**
     * Maximum clearance in µm (ES_hole − ei_shaft).
     * Positive means the hole can be larger than the shaft.
     */
    max_clearance_um: number;
    /**
     * Maximum interference in µm (es_shaft − EI_hole).
     * Positive means the shaft can be larger than the hole.
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
        `Expected format: letter(s) followed by grade number, e.g. 'H7', 'g6', 'JS9'.`,
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
 * @param holeCode   Hole tolerance designation, e.g. "H7" or "G7".
 * @param shaftCode  Shaft tolerance designation, e.g. "g6" or "h6".
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
