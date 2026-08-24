/**
 * tolerance_stackup — worst-case and RSS dimension chain analysis.
 *
 * Both methods are deterministic:
 *   Worst-case: every contributor simultaneously at its extreme in the
 *     worst direction. Bounds the combinations described by the supplied
 *     contributor intervals; no acceptance threshold is inferred.
 *   RSS (Root Sum Square): statistical estimate assuming independent,
 *     normally distributed dimensions. Does NOT guarantee 100 % conformance;
 *     use only when the process capability and distribution are known.
 *
 * Positive clearance = gap; negative = interference.
 * No Monte Carlo — all results are closed-form.
 *
 * @module lib/tolerance/tools/stackup
 */

import type { ToleranceTool } from "./types.ts";

const TOOL_NAME = "tolerance_stackup";

const NOT_CHECKED = [
  "RSS assumes all contributors are independent and normally distributed — this is often not the case. Use worst-case for safety-critical applications.",
  "Geometric tolerances (flatness, squareness, parallelism) that contribute to the assembly gap are not modelled — add them as explicit contributors if needed.",
  "Temperature-induced dimensional changes are not modelled.",
  "The RSS result does NOT guarantee 100 % assembly conformance. The fraction of assemblies within the RSS limits depends on process sigma level.",
  "Direction must be +1 or −1 (integer). Values other than ±1 are rejected.",
  "plus_um and minus_um must be finite non-negative values in µm. Bilateral symmetric tolerances (±t mm) should be entered as plus_um = minus_um = t×1000.",
];

/** One contributor to a dimension chain. */
interface Contributor {
  name: string;
  nominal_mm: number;
  plus_um: number; // upper tolerance offset in µm (≥ 0)
  minus_um: number; // lower tolerance offset in µm (≥ 0)
  direction: 1 | -1; // +1 adds to assembly; −1 subtracts
}

/** Per-contributor terms used to form the aggregate stack-up bounds. */
interface ContributorBreakdownItem {
  name: string;
  signed_nominal_mm: number;
  worst_case_upper_excursion_mm: number;
  worst_case_lower_excursion_mm: number;
  rss_upper_sq_mm2: number;
  rss_lower_sq_mm2: number;
}

const CONTRIBUTOR_BREAKDOWN_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "signed_nominal_mm",
    "worst_case_upper_excursion_mm",
    "worst_case_lower_excursion_mm",
    "rss_upper_sq_mm2",
    "rss_lower_sq_mm2",
  ],
  properties: {
    name: {
      type: "string",
      description: "Contributor label, copied from input in the same order.",
    },
    signed_nominal_mm: {
      type: "number",
      description: "Signed nominal contribution in mm: direction × nominal_mm.",
    },
    worst_case_upper_excursion_mm: {
      type: "number",
      description: "Non-negative worst-case upper excursion in mm. " +
        "For direction +1 this is plus_um/1000; for direction −1 this is minus_um/1000.",
    },
    worst_case_lower_excursion_mm: {
      type: "number",
      description: "Non-negative worst-case lower excursion in mm. " +
        "For direction +1 this is minus_um/1000; for direction −1 this is plus_um/1000.",
    },
    rss_upper_sq_mm2: {
      type: "number",
      description: "Upper RSS squared term in mm², equal to " +
        "worst_case_upper_excursion_mm². rss_max_mm = nominal_mm + sqrt(Σ rss_upper_sq_mm2).",
    },
    rss_lower_sq_mm2: {
      type: "number",
      description: "Lower RSS squared term in mm², equal to " +
        "worst_case_lower_excursion_mm². rss_min_mm = nominal_mm − sqrt(Σ rss_lower_sq_mm2).",
    },
  },
};

const CONTRIBUTOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "nominal_mm", "plus_um", "minus_um", "direction"],
  properties: {
    name: { type: "string", description: "Human-readable label for this dimension." },
    nominal_mm: {
      type: "number",
      description:
        "Nominal dimension in mm (may be negative for a subtracted distance).",
    },
    plus_um: {
      type: "number",
      description: "Upper tolerance offset in µm, ≥ 0. " +
        "For bilateral ±0.05 mm: plus_um=50.",
    },
    minus_um: {
      type: "number",
      description: "Lower tolerance offset in µm, ≥ 0. " +
        "For a unilateral +0/−0.02 mm: plus_um=0, minus_um=20.",
    },
    direction: {
      type: "integer",
      enum: [1, -1],
      description:
        "+1: this dimension adds to the assembly gap (e.g. a spacer thickness). " +
        "−1: this dimension subtracts from the assembly gap (e.g. a shaft length).",
    },
  },
};

const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    violations: {
      type: "array",
      description: "Always empty for this tool — no threshold is declared.",
      items: { type: "string" },
    },
    provenance: { type: "string" },
    nominal_mm: {
      type: "number",
      description: "Assembly nominal = Σ(direction_i × nominal_mm_i).",
    },
    contributor_count: { type: "integer" },
    worst_case_min_mm: {
      type: "number",
      description:
        "Minimum assembly value under worst-case analysis (all contributors " +
        "simultaneously at their worst extreme for the minimum direction).",
    },
    worst_case_max_mm: {
      type: "number",
      description: "Maximum assembly value under worst-case analysis.",
    },
    rss_min_mm: {
      type: "number",
      description: "Minimum assembly value under RSS analysis. " +
        "Does not guarantee 100 % conformance — see not_checked.",
    },
    rss_max_mm: {
      type: "number",
      description: "Maximum assembly value under RSS analysis.",
    },
    contributor_breakdown: {
      type: "array",
      minItems: 1,
      items: CONTRIBUTOR_BREAKDOWN_ITEM_SCHEMA,
      description:
        "Per-contributor signed nominal and worst-case/RSS terms, in input order. " +
        "These are the same values used to form the aggregate bounds, not a " +
        "separate ranking or share calculation.",
    },
    not_checked: { type: "array", items: { type: "string" } },
  },
};

function validateContributors(raw: unknown): Contributor[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new TypeError(
      "contributors must be a non-empty array of contributor objects.",
    );
  }
  return raw.map((item, idx) => {
    if (typeof item !== "object" || item === null) {
      throw new TypeError(`contributors[${idx}] must be an object.`);
    }
    const c = item as Record<string, unknown>;
    const name = typeof c.name === "string" ? c.name : `contributor_${idx}`;
    const nominal_mm = c.nominal_mm;
    if (typeof nominal_mm !== "number" || !isFinite(nominal_mm)) {
      throw new TypeError(
        `contributors[${idx}].nominal_mm must be a finite number; got ${
          JSON.stringify(nominal_mm)
        }.`,
      );
    }
    const plus_um = c.plus_um;
    if (typeof plus_um !== "number" || !isFinite(plus_um) || plus_um < 0) {
      throw new TypeError(
        `contributors[${idx}].plus_um must be a finite non-negative number; got ${
          JSON.stringify(plus_um)
        }.`,
      );
    }
    const minus_um = c.minus_um;
    if (typeof minus_um !== "number" || !isFinite(minus_um) || minus_um < 0) {
      throw new TypeError(
        `contributors[${idx}].minus_um must be a finite non-negative number; got ${
          JSON.stringify(minus_um)
        }.`,
      );
    }
    const direction = c.direction;
    if (direction !== 1 && direction !== -1) {
      throw new TypeError(
        `contributors[${idx}].direction must be 1 or −1; got ${
          JSON.stringify(direction)
        }.`,
      );
    }
    return {
      name,
      nominal_mm: nominal_mm as number,
      plus_um: plus_um as number,
      minus_um: minus_um as number,
      direction: direction as 1 | -1,
    };
  });
}

export const toleranceStackupTool: ToleranceTool = {
  name: TOOL_NAME,
  category: "stack",
  description:
    "Compute worst-case and RSS (Root Sum Square) dimension chain stackup. " +
    "Each contributor has a nominal_mm, plus_um (upper tolerance offset in µm), " +
    "minus_um (lower tolerance offset in µm), and direction (+1 = adds to gap, −1 = subtracts). " +
    "Returns worst_case_min/max_mm, rss_min/max_mm, and contributor_breakdown " +
    "(signed nominal and worst-case/RSS terms in input order). " +
    "Worst-case bounds every combination of the supplied intervals; RSS is statistical. " +
    "No verdict — the caller decides whether the computed gap is acceptable.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["contributors"],
    properties: {
      contributors: {
        type: "array",
        minItems: 1,
        items: CONTRIBUTOR_SCHEMA,
        description:
          "Ordered list of dimensions in the chain. Input order is preserved in " +
          "contributor_breakdown; aggregate bounds do not depend on order.",
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
    const contributors = validateContributors(args["contributors"]);

    // Per-contributor terms are accumulated once and reused for the aggregates.
    // Worst-case:
    //   max: direction=+1 uses plus, direction=−1 uses minus
    //   min: direction=+1 uses minus, direction=−1 uses plus
    const contributor_breakdown: ContributorBreakdownItem[] = [];
    let nominal_mm = 0;
    let wc_plus = 0;
    let wc_minus = 0;
    let rss_plus_sq = 0;
    let rss_minus_sq = 0;

    for (const c of contributors) {
      const plus_mm = c.plus_um / 1000;
      const minus_mm = c.minus_um / 1000;
      const worst_case_upper_excursion_mm = c.direction === 1 ? plus_mm : minus_mm;
      const worst_case_lower_excursion_mm = c.direction === 1 ? minus_mm : plus_mm;
      const item: ContributorBreakdownItem = {
        name: c.name,
        signed_nominal_mm: c.direction * c.nominal_mm,
        worst_case_upper_excursion_mm,
        worst_case_lower_excursion_mm,
        rss_upper_sq_mm2: worst_case_upper_excursion_mm *
          worst_case_upper_excursion_mm,
        rss_lower_sq_mm2: worst_case_lower_excursion_mm *
          worst_case_lower_excursion_mm,
      };
      contributor_breakdown.push(item);
      nominal_mm += item.signed_nominal_mm;
      wc_plus += item.worst_case_upper_excursion_mm;
      wc_minus += item.worst_case_lower_excursion_mm;
      rss_plus_sq += item.rss_upper_sq_mm2;
      rss_minus_sq += item.rss_lower_sq_mm2;
    }

    const worst_case_max_mm = nominal_mm + wc_plus;
    const worst_case_min_mm = nominal_mm - wc_minus;
    const rss_max_mm = nominal_mm + Math.sqrt(rss_plus_sq);
    const rss_min_mm = nominal_mm - Math.sqrt(rss_minus_sq);

    const fmt = (v: number) => v.toFixed(4);

    return {
      content:
        `[${TOOL_NAME}] ${contributors.length} contributors, nominal=${
          fmt(nominal_mm)
        } mm ` +
        `WC [${fmt(worst_case_min_mm)}, ${fmt(worst_case_max_mm)}] mm ` +
        `RSS [${fmt(rss_min_mm)}, ${fmt(rss_max_mm)}] mm`,
      structuredContent: {
        violations: [],
        provenance:
          "Worst-case arithmetic stackup + RSS (Root Sum Square), deterministic",
        nominal_mm,
        contributor_count: contributors.length,
        worst_case_min_mm,
        worst_case_max_mm,
        rss_min_mm,
        rss_max_mm,
        contributor_breakdown,
        not_checked: NOT_CHECKED,
      },
    };
  },
};
