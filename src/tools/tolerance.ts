/**
 * tolerance_fit and tolerance_it — ISO 286-1 dimensional fit and IT grade tools.
 *
 * No verdict — these tools compute limits and report measured deviations.
 * The caller decides whether a computed fit is appropriate for the application.
 *
 * @module lib/tolerance/tools/tolerance
 */

import type { ToleranceTool } from "./types.ts";
import {
  computeFit,
  DIAMETER_RANGES,
  findRangeIndex,
  fundamentalTolerance,
  SUPPORTED_SHAFT_LETTERS,
} from "../api/iso286.ts";

// ── tolerance_fit ──────────────────────────────────────────────────────────

const FIT_TOOL_NAME = "tolerance_fit";

const NOT_CHECKED_FIT = [
  "Surface roughness and form tolerances are not included — this tool computes size limits only.",
  "Geometric tolerances (circularity, cylindricity, perpendicularity) are not modelled.",
  "Thermal expansion effects on the actual assembled fit are not computed.",
  "Assembly forces, press-fit stresses, and retained stress for interference fits are not computed.",
  `Supported shaft letters: ${
    SUPPORTED_SHAFT_LETTERS.join(", ")
  }. Other shaft letters are not implemented.`,
  "The engine uses the 13 main ISO 286-1 diameter ranges. Letters where the standard defines sub-ranges within a main range (notably r, s, u for sizes 50–80 mm) may deviate by 1–6 µm from the sub-range tabulated value.",
  "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
];

const FIT_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "violations",
    "provenance",
    "nominal_diameter_mm",
    "diameter_range_mm",
    "hole",
    "shaft",
    "fit",
    "not_checked",
  ],
  properties: {
    violations: {
      type: "array",
      description: "Always empty for this tool — no threshold is declared.",
      items: { type: "string" },
    },
    provenance: { type: "string" },
    nominal_diameter_mm: { type: "number" },
    diameter_range_mm: {
      type: "array",
      items: { type: "number" },
      minItems: 2,
      maxItems: 2,
    },
    hole: {
      type: "object",
      additionalProperties: false,
      required: ["letter", "grade", "EI_um", "ES_um", "IT_um", "designation"],
      properties: {
        letter: { type: "string" },
        grade: { type: "integer" },
        EI_um: { type: "number" },
        ES_um: { type: "number" },
        IT_um: { type: "number" },
        designation: { type: "string" },
      },
    },
    shaft: {
      type: "object",
      additionalProperties: false,
      required: ["letter", "grade", "ei_um", "es_um", "IT_um", "designation"],
      properties: {
        letter: { type: "string" },
        grade: { type: "integer" },
        ei_um: { type: "number" },
        es_um: { type: "number" },
        IT_um: { type: "number" },
        designation: { type: "string" },
      },
    },
    fit: {
      type: "object",
      additionalProperties: false,
      required: [
        "type",
        "max_clearance_um",
        "min_clearance_um",
        "max_interference_um",
        "min_interference_um",
      ],
      properties: {
        type: {
          type: "string",
          enum: ["clearance", "transition", "interference"],
        },
        max_clearance_um: { type: "number" },
        min_clearance_um: { type: "number" },
        max_interference_um: { type: "number" },
        min_interference_um: { type: "number" },
      },
    },
    not_checked: { type: "array", items: { type: "string" } },
  },
};

const toleranceFitTool: ToleranceTool = {
  name: FIT_TOOL_NAME,
  category: "fit",
  description:
    "Compute hole and shaft deviation limits and fit type for a hole/shaft " +
    "tolerance designation pair at a given nominal diameter, using ISO 286-1:2010 " +
    "formulas and tables. " +
    "Returns EI/ES for the hole, ei/es for the shaft, fit type " +
    "(clearance/transition/interference), and clearance/interference extremes in µm. " +
    "Provenance is declared on every result. " +
    "No verdict — the tool reports limits; the caller determines fit suitability.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["hole_code", "shaft_code", "nominal_diameter_mm"],
    properties: {
      hole_code: {
        type: "string",
        description: "Hole tolerance designation, e.g. 'H7'. Currently only 'H' is " +
          "supported as the hole letter (ISO hole-system base). " +
          "Grade must be 1–18.",
        examples: ["H7", "H6", "H8", "H11"],
      },
      shaft_code: {
        type: "string",
        description: "Shaft tolerance designation, e.g. 'g6'. Supported letters: " +
          SUPPORTED_SHAFT_LETTERS.join(", ") +
          ". Grade must be 1–18.",
        examples: ["g6", "h6", "p6", "f7", "k6", "n6", "s6", "u6", "js7"],
      },
      nominal_diameter_mm: {
        type: "number",
        description: "Nominal diameter of the fit in mm, in the range (0, 500]. " +
          "The engine selects the ISO 286-1 diameter range automatically.",
        exclusiveMinimum: 0,
        maximum: 500,
      },
    },
  },
  outputSchema: FIT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(args) {
    const holeCode = String(args["hole_code"] ?? "");
    const shaftCode = String(args["shaft_code"] ?? "");
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

    const result = computeFit(holeCode, shaftCode, rawDiam);

    const summary = `${holeCode}/${shaftCode} @ ${rawDiam} mm → ` +
      `hole ${result.hole.EI_um >= 0 ? "+" : ""}${result.hole.EI_um}/` +
      `+${result.hole.ES_um} µm, ` +
      `shaft ${result.shaft.ei_um >= 0 ? "+" : ""}${result.shaft.ei_um}/` +
      `${result.shaft.es_um >= 0 ? "+" : ""}${result.shaft.es_um} µm, ` +
      `fit: ${result.fit.type}`;

    return {
      content: `[${FIT_TOOL_NAME}] ${summary}`,
      structuredContent: {
        violations: [],
        provenance: result.provenance,
        nominal_diameter_mm: result.nominal_diameter_mm,
        diameter_range_mm: result.diameter_range_mm,
        hole: result.hole,
        shaft: result.shaft,
        fit: result.fit,
        not_checked: NOT_CHECKED_FIT,
      },
    };
  },
};

// ── tolerance_it ───────────────────────────────────────────────────────────

const IT_TOOL_NAME = "tolerance_it";

const NOT_CHECKED_IT = [
  "IT grades 1–4 are tabulated values from ISO 286-1:2010 Table 1; they are not formula-derived.",
  "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
];

const IT_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "violations",
    "provenance",
    "grade",
    "nominal_diameter_mm",
    "diameter_range_mm",
    "IT_um",
    "not_checked",
  ],
  properties: {
    violations: { type: "array", items: { type: "string" } },
    provenance: { type: "string" },
    grade: { type: "integer" },
    nominal_diameter_mm: { type: "number" },
    diameter_range_mm: {
      type: "array",
      items: { type: "number" },
      minItems: 2,
      maxItems: 2,
    },
    IT_um: {
      type: "number",
      description: "Fundamental tolerance value in µm.",
    },
    not_checked: { type: "array", items: { type: "string" } },
  },
};

const toleranceItTool: ToleranceTool = {
  name: IT_TOOL_NAME,
  category: "fit",
  description:
    "Return the fundamental tolerance value IT in µm for a given IT grade and " +
    "nominal diameter, per ISO 286-1:2010. " +
    "Grades 5–18 are computed from the tolerance factor formula; " +
    "grades 1–4 are from ISO 286-1:2010 Table 1. " +
    "Provenance is declared on every result. " +
    "No verdict.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["grade", "nominal_diameter_mm"],
    properties: {
      grade: {
        type: "integer",
        description: "IT grade number, 1–18.",
        minimum: 1,
        maximum: 18,
      },
      nominal_diameter_mm: {
        type: "number",
        description: "Nominal diameter in mm, in (0, 500].",
        exclusiveMinimum: 0,
        maximum: 500,
      },
    },
  },
  outputSchema: IT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(args) {
    const rawGrade = args["grade"];
    const rawDiam = args["nominal_diameter_mm"];

    if (
      typeof rawGrade !== "number" ||
      !Number.isInteger(rawGrade) ||
      rawGrade < 1 ||
      rawGrade > 18
    ) {
      throw new TypeError(
        `grade must be an integer 1–18; got ${JSON.stringify(rawGrade)}.`,
      );
    }
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

    const ri = findRangeIndex(rawDiam);
    const range = DIAMETER_RANGES[ri];
    const IT = fundamentalTolerance(rawGrade, rawDiam);

    return {
      content: `[${IT_TOOL_NAME}] IT${rawGrade} @ ${rawDiam} mm → ${IT} µm`,
      structuredContent: {
        violations: [],
        provenance: "ISO 286-1:2010 formulas/tables",
        grade: rawGrade,
        nominal_diameter_mm: rawDiam,
        diameter_range_mm: [range[0], range[1]],
        IT_um: IT,
        not_checked: NOT_CHECKED_IT,
      },
    };
  },
};

// ── Exports ────────────────────────────────────────────────────────────────

export const fitTools: ToleranceTool[] = [toleranceFitTool, toleranceItTool];
