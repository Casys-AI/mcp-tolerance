/**
 * tolerance_limits — resolve a single tolerance class to upper/lower limits.
 *
 * @module lib/tolerance/tools/limits
 */

import type { ToleranceTool } from "./types.ts";
import {
  DIAMETER_RANGES,
  findRangeIndex,
  fundamentalTolerance,
  holeDeviations,
  parseDesignation,
  shaftDeviations,
  SUPPORTED_HOLE_LETTERS,
  SUPPORTED_SHAFT_LETTERS,
} from "../api/iso286.ts";

const TOOL_NAME = "tolerance_limits";

const NOT_CHECKED = [
  "Surface roughness and form tolerances are not included — this tool computes size limits only.",
  "Geometric tolerances (circularity, cylindricity) are not modelled.",
  "Only the 13 main ISO 286-1 diameter ranges are used. Sub-ranges (e.g. 50–65 / 65–80 within 50–80) are not distinguished; shaft letters r, s, u may deviate 1–6 µm from sub-range tabulated values.",
  "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
  `Supported hole letters: ${
    SUPPORTED_HOLE_LETTERS.join(", ")
  }. Other hole letters are not implemented.`,
  `Supported shaft letters: ${
    SUPPORTED_SHAFT_LETTERS.join(", ")
  }. Other shaft letters are not implemented.`,
];

const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    violations: {
      type: "array",
      description: "Always empty for this tool — no threshold is declared.",
      items: { type: "string" },
    },
    provenance: { type: "string" },
    designation: { type: "string" },
    designation_type: {
      type: "string",
      enum: ["hole", "shaft"],
      description:
        "'hole' for uppercase letters (A–ZC); 'shaft' for lowercase letters (a–zc).",
    },
    nominal_diameter_mm: { type: "number" },
    diameter_range_mm: {
      type: "array",
      items: { type: "number" },
      minItems: 2,
      maxItems: 2,
    },
    it_grade: { type: "integer" },
    IT_um: { type: "number", description: "Fundamental tolerance width in µm." },
    fundamental_deviation_um: {
      type: "number",
      description: "The deviation closest to the nominal line (zero line) in µm. " +
        "For clearance shafts (c–g): es (negative). " +
        "For shaft h: 0. " +
        "For shaft js: not applicable (symmetric), returns 0. " +
        "For interference shafts (k–u): ei (positive). " +
        "For clearance holes (C–G): EI (positive). " +
        "For hole H: 0. " +
        "For interference/transition holes (K–S): ES (negative).",
    },
    upper_um: {
      type: "number",
      description: "Upper deviation in µm above the nominal. " +
        "For holes: ES. For shafts: es.",
    },
    lower_um: {
      type: "number",
      description: "Lower deviation in µm above the nominal. " +
        "For holes: EI. For shafts: ei.",
    },
    not_checked: { type: "array", items: { type: "string" } },
  },
};

export const toleranceLimitsTool: ToleranceTool = {
  name: TOOL_NAME,
  category: "fit",
  description:
    "Resolve a single ISO 286-1 tolerance class designation (e.g. 'H7', 'g6', 'JS9', 'P6') " +
    "to upper and lower deviations in µm at a given nominal diameter. " +
    "Returns upper_um, lower_um, IT_um, fundamental_deviation_um, and provenance. " +
    "Uppercase letter = hole; lowercase letter = shaft. " +
    "Provenance is declared on every result. No verdict.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["tolerance_class", "nominal_diameter_mm"],
    properties: {
      tolerance_class: {
        type: "string",
        description: "ISO 286-1 tolerance class designation. " +
          "Uppercase letter(s) + grade for holes (e.g. 'H7', 'G6', 'JS9', 'P6'). " +
          "Lowercase letter(s) + grade for shafts (e.g. 'g6', 'h6', 'js7', 'p6'). " +
          `Supported hole letters: ${SUPPORTED_HOLE_LETTERS.join(", ")}. ` +
          `Supported shaft letters: ${SUPPORTED_SHAFT_LETTERS.join(", ")}.`,
        examples: ["H7", "g6", "JS9", "P6", "f7", "K6", "n6", "r6"],
      },
      nominal_diameter_mm: {
        type: "number",
        description: "Nominal diameter of the feature in mm, in the range (0, 500].",
        exclusiveMinimum: 0,
        maximum: 500,
      },
    },
  },
  outputSchema: OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(args) {
    const cls = String(args["tolerance_class"] ?? "");
    const rawDiam = args["nominal_diameter_mm"];

    if (typeof rawDiam !== "number" || !isFinite(rawDiam)) {
      throw new TypeError(
        `nominal_diameter_mm must be a finite number; got ${JSON.stringify(rawDiam)}.`,
      );
    }
    if (rawDiam <= 0 || rawDiam > 500) {
      throw new RangeError(
        `nominal_diameter_mm must be in (0, 500]; got ${rawDiam}.`,
      );
    }

    const parsed = parseDesignation(cls);
    const { letter, grade } = parsed;
    const isHole = letter === letter.toUpperCase() && letter.length > 0;
    const isShaft = letter === letter.toLowerCase() && letter.length > 0;

    if (!isHole && !isShaft) {
      throw new TypeError(
        `Cannot determine whether '${cls}' is a hole (uppercase) or shaft (lowercase).`,
      );
    }

    const ri = findRangeIndex(rawDiam);
    const range = DIAMETER_RANGES[ri];
    const IT = fundamentalTolerance(grade, rawDiam);

    let upper_um: number;
    let lower_um: number;
    let fundamental_deviation_um: number;
    let designation_type: "hole" | "shaft";

    if (isHole) {
      designation_type = "hole";
      const dev = holeDeviations(letter, grade, rawDiam);
      upper_um = dev.ES_um;
      lower_um = dev.EI_um;
      // Fundamental deviation: EI for clearance holes, 0 for H, ES for interference holes
      if (letter === "H") {
        fundamental_deviation_um = 0;
      } else if (letter === "JS") {
        fundamental_deviation_um = 0; // symmetric — no single fundamental deviation
      } else {
        // Clearance (C–G): EI is fundamental deviation (positive)
        // Interference (K–S): ES is fundamental deviation (negative)
        const lc = letter.toLowerCase();
        const isClr = ["c", "d", "e", "f", "g"].includes(lc);
        fundamental_deviation_um = isClr ? dev.EI_um : dev.ES_um;
      }
    } else {
      designation_type = "shaft";
      const dev = shaftDeviations(letter, grade, rawDiam);
      upper_um = dev.es_um;
      lower_um = dev.ei_um;
      if (letter === "h") {
        fundamental_deviation_um = 0;
      } else if (letter === "js") {
        fundamental_deviation_um = 0; // symmetric
      } else {
        // Clearance (c–g): es is fundamental deviation (negative)
        // Interference (k–u): ei is fundamental deviation (positive)
        const isClr = ["c", "d", "e", "f", "g"].includes(letter);
        fundamental_deviation_um = isClr ? dev.es_um : dev.ei_um;
      }
    }

    return {
      content: `[${TOOL_NAME}] ${cls} @ ${rawDiam} mm → ` +
        `${designation_type} ${lower_um >= 0 ? "+" : ""}${lower_um}/` +
        `${upper_um >= 0 ? "+" : ""}${upper_um} µm (IT${grade}=${IT} µm)`,
      structuredContent: {
        violations: [],
        provenance: "ISO 286-1:2010 formulas/tables",
        designation: cls,
        designation_type,
        nominal_diameter_mm: rawDiam,
        diameter_range_mm: [range[0], range[1]],
        it_grade: grade,
        IT_um: IT,
        fundamental_deviation_um,
        upper_um,
        lower_um,
        not_checked: NOT_CHECKED,
      },
    };
  },
};
