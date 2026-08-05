/**
 * tolerance_stackup — worst-case and RSS dimension chain analysis.
 *
 * Both methods are deterministic:
 *   Worst-case: every contributor simultaneously at its extreme in the
 *     worst direction. Guarantees assembly conformance for 100 % of parts.
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
  "plus_um and minus_um must be non-negative integers in µm. Bilateral symmetric tolerances (±t mm) should be entered as plus_um = minus_um = t×1000.",
];

/** One contributor to a dimension chain. */
interface Contributor {
  name: string;
  nominal_mm: number;
  plus_um: number; // upper tolerance offset in µm (≥ 0)
  minus_um: number; // lower tolerance offset in µm (≥ 0)
  direction: 1 | -1; // +1 adds to assembly; −1 subtracts
}

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
    "Returns worst_case_min/max_mm and rss_min/max_mm. " +
    "Worst-case guarantees 100 % conformance; RSS is statistical. " +
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
          "Ordered list of dimensions in the chain. Order does not affect results.",
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

    // Assembly nominal = Σ(direction × nominal)
    const nominal_mm = contributors.reduce(
      (acc, c) => acc + c.direction * c.nominal_mm,
      0,
    );

    // Worst-case:
    // For max assembly: direction=+1 contributors use nominal+plus, direction=−1 use nominal−minus
    // For min assembly: direction=+1 contributors use nominal−minus, direction=−1 use nominal+plus
    let wc_plus = 0; // sum of worst-case upper offsets
    let wc_minus = 0; // sum of worst-case lower offsets
    let rss_plus_sq = 0; // sum of squares for RSS upper
    let rss_minus_sq = 0; // sum of squares for RSS lower

    for (const c of contributors) {
      const plus_mm = c.plus_um / 1000;
      const minus_mm = c.minus_um / 1000;

      if (c.direction === 1) {
        wc_plus += plus_mm; // direction=+1: upper offset pushes assembly up
        wc_minus += minus_mm; // direction=+1: lower offset pulls assembly down
        rss_plus_sq += plus_mm * plus_mm;
        rss_minus_sq += minus_mm * minus_mm;
      } else {
        // direction=−1: contribution = −(nominal ± tol)
        //   max assembly (least negative): use nominal − minus_mm → +(minus_mm offset)
        //   min assembly (most negative): use nominal + plus_mm → −(plus_mm offset)
        wc_plus += minus_mm; // contributes +minus when direction=−1 for max
        wc_minus += plus_mm; // contributes −plus when direction=−1 for min
        rss_plus_sq += minus_mm * minus_mm;
        rss_minus_sq += plus_mm * plus_mm;
      }
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
        not_checked: NOT_CHECKED,
      },
    };
  },
};
