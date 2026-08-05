/**
 * tolerance_fit_analyze — hole/shaft fit analysis with extended hole letter support.
 *
 * Covers both the hole-basis system (H as base hole) and the shaft-basis
 * system (h as base shaft, with hole letters C–G, JS, K–S for the mating hole).
 *
 * @module lib/tolerance/tools/fit_analyze
 */

import type { ToleranceTool } from "./types.ts";
import {
  computeFit,
  SUPPORTED_HOLE_LETTERS,
  SUPPORTED_SHAFT_LETTERS,
} from "../api/iso286.ts";

const TOOL_NAME = "tolerance_fit_analyze";

const NOT_CHECKED = [
  "Surface roughness and form tolerances are not included — this tool computes size limits only.",
  "Geometric tolerances (circularity, cylindricity, perpendicularity) are not modelled.",
  "Thermal expansion effects on the actual assembled fit are not computed.",
  "Assembly forces, press-fit stresses, and retained stress for interference fits are not computed.",
  "Only the 13 main ISO 286-1 diameter ranges are used. Sub-ranges (e.g. 50–65 / 65–80 within 50–80) are not distinguished; shaft letters r, s, u may deviate 1–6 µm from sub-range tabulated values.",
  "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
  `Supported hole letters: ${SUPPORTED_HOLE_LETTERS.join(", ")}.`,
  `Supported shaft letters: ${SUPPORTED_SHAFT_LETTERS.join(", ")}.`,
];

const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
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
      required: ["designation", "letter", "grade", "EI_um", "ES_um", "IT_um"],
      properties: {
        designation: { type: "string" },
        letter: { type: "string" },
        grade: { type: "integer" },
        EI_um: { type: "number" },
        ES_um: { type: "number" },
        IT_um: { type: "number" },
      },
    },
    shaft: {
      type: "object",
      additionalProperties: false,
      required: ["designation", "letter", "grade", "ei_um", "es_um", "IT_um"],
      properties: {
        designation: { type: "string" },
        letter: { type: "string" },
        grade: { type: "integer" },
        ei_um: { type: "number" },
        es_um: { type: "number" },
        IT_um: { type: "number" },
      },
    },
    clearance_min_um: {
      type: "number",
      description: "Tightest possible fit in µm: EI_hole − es_shaft. " +
        "Positive = minimum clearance; negative = maximum interference.",
    },
    clearance_max_um: {
      type: "number",
      description: "Loosest possible fit in µm: ES_hole − ei_shaft. " +
        "Always ≥ clearance_min_um. Positive = maximum clearance.",
    },
    fit_type: {
      type: "string",
      enum: ["clearance", "transition", "interference"],
      description:
        "clearance: all combinations have positive clearance (shaft always smaller). " +
        "interference: all combinations have negative clearance (shaft always larger). " +
        "transition: fit can be clearance or interference depending on actual parts.",
    },
    not_checked: { type: "array", items: { type: "string" } },
  },
};

export const toleranceFitAnalyzeTool: ToleranceTool = {
  name: TOOL_NAME,
  category: "fit",
  description:
    "Analyse a hole/shaft fit by tolerance class pair at a given nominal diameter. " +
    "Returns hole and shaft deviation limits and the fit characterisation: " +
    "clearance_min_um (EI_hole − es_shaft), clearance_max_um (ES_hole − ei_shaft), " +
    "and fit_type (clearance / transition / interference). " +
    "Supports both the hole-basis system (H_ hole) and the shaft-basis system " +
    "(h_ shaft with non-H hole letters). " +
    "Provenance declared on every result. No verdict.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["hole_class", "shaft_class", "nominal_diameter_mm"],
    properties: {
      hole_class: {
        type: "string",
        description: "Hole tolerance class, uppercase letter + grade. " +
          `Supported hole letters: ${SUPPORTED_HOLE_LETTERS.join(", ")}.`,
        examples: ["H7", "G6", "JS9", "K6", "P7"],
      },
      shaft_class: {
        type: "string",
        description: "Shaft tolerance class, lowercase letter + grade. " +
          `Supported shaft letters: ${SUPPORTED_SHAFT_LETTERS.join(", ")}.`,
        examples: ["g6", "h6", "js7", "k6", "p6", "f7", "n6", "r6"],
      },
      nominal_diameter_mm: {
        type: "number",
        description: "Nominal diameter of the fit in mm, in the range (0, 500].",
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
    const holeClass = String(args["hole_class"] ?? "");
    const shaftClass = String(args["shaft_class"] ?? "");
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

    const result = computeFit(holeClass, shaftClass, rawDiam);

    // clearance_min = tightest fit (EI_hole − es_shaft)
    const clearance_min_um = result.fit.min_clearance_um;
    // clearance_max = loosest fit (ES_hole − ei_shaft)
    const clearance_max_um = result.fit.max_clearance_um;

    return {
      content: `[${TOOL_NAME}] ${holeClass}/${shaftClass} @ ${rawDiam} mm → ` +
        `${result.fit.type}, clearance [${clearance_min_um}, ${clearance_max_um}] µm`,
      structuredContent: {
        violations: [],
        provenance: result.provenance,
        nominal_diameter_mm: result.nominal_diameter_mm,
        diameter_range_mm: result.diameter_range_mm,
        hole: {
          designation: result.hole.designation,
          letter: result.hole.letter,
          grade: result.hole.grade,
          EI_um: result.hole.EI_um,
          ES_um: result.hole.ES_um,
          IT_um: result.hole.IT_um,
        },
        shaft: {
          designation: result.shaft.designation,
          letter: result.shaft.letter,
          grade: result.shaft.grade,
          ei_um: result.shaft.ei_um,
          es_um: result.shaft.es_um,
          IT_um: result.shaft.IT_um,
        },
        clearance_min_um,
        clearance_max_um,
        fit_type: result.fit.type,
        not_checked: NOT_CHECKED,
      },
    };
  },
};
