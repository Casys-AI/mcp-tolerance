/** Frozen representative tool payloads for viewer tests. */

export const LIMITS_H7 = {
  violations: [],
  provenance: "ISO 286-1:2010 formulas/tables",
  designation: "H7",
  designation_type: "hole",
  nominal_diameter_mm: 25,
  diameter_range_mm: [18, 30],
  it_grade: 7,
  IT_um: 21,
  fundamental_deviation_um: 0,
  upper_um: 21,
  lower_um: 0,
  not_checked: [
    "Surface roughness and form tolerances are not included — this tool computes size limits only.",
    "Geometric tolerances (circularity, cylindricity) are not modelled.",
    "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
  ],
} as const;

export const IT7 = {
  violations: [],
  provenance: "ISO 286-1:2010 formulas/tables",
  grade: 7,
  nominal_diameter_mm: 25,
  diameter_range_mm: [18, 30],
  IT_um: 21,
  not_checked: [
    "IT grades 1–4 are tabulated values from ISO 286-1:2010 Table 1; they are not formula-derived.",
    "Nominal diameters above 500 mm or at or below 0 mm are outside ISO 286-1 and will be rejected.",
  ],
} as const;

export const FIT_H7_P6 = {
  violations: [],
  provenance: "ISO 286-1:2010 formulas/tables",
  nominal_diameter_mm: 25,
  diameter_range_mm: [18, 30],
  hole: {
    letter: "H",
    grade: 7,
    EI_um: 0,
    ES_um: 21,
    IT_um: 21,
    designation: "H7",
  },
  shaft: {
    letter: "p",
    grade: 6,
    ei_um: 22,
    es_um: 35,
    IT_um: 13,
    designation: "p6",
  },
  fit: {
    type: "interference",
    max_clearance_um: -1,
    min_clearance_um: -35,
    max_interference_um: 35,
    min_interference_um: 1,
  },
  not_checked: [
    "Surface roughness and form tolerances are not included — this tool computes size limits only.",
    "Geometric tolerances (circularity, cylindricity, perpendicularity) are not modelled.",
  ],
} as const;

export const FIT_ANALYZE_H7_G6 = {
  violations: [],
  provenance: "ISO 286-1:2010 formulas/tables",
  nominal_diameter_mm: 25,
  diameter_range_mm: [18, 30],
  hole: {
    designation: "H7",
    letter: "H",
    grade: 7,
    EI_um: 0,
    ES_um: 21,
    IT_um: 21,
  },
  shaft: {
    designation: "g6",
    letter: "g",
    grade: 6,
    ei_um: -20,
    es_um: -7,
    IT_um: 13,
  },
  clearance_min_um: 7,
  clearance_max_um: 41,
  fit_type: "clearance",
  not_checked: [
    "Surface roughness and form tolerances are not included — this tool computes size limits only.",
  ],
} as const;

export const STACKUP_TWO = {
  violations: [],
  provenance: "Worst-case arithmetic stackup + RSS (Root Sum Square), deterministic",
  nominal_mm: 10,
  contributor_count: 2,
  worst_case_min_mm: 9.88,
  worst_case_max_mm: 10.125,
  rss_min_mm: 9.910557280900008,
  rss_max_mm: 10.103077640640441,
  contributor_breakdown: [
    {
      name: "housing depth",
      signed_nominal_mm: 50,
      worst_case_upper_excursion_mm: 0.1,
      worst_case_lower_excursion_mm: 0.04,
      rss_upper_sq_mm2: 0.010000000000000002,
      rss_lower_sq_mm2: 0.0016,
    },
    {
      name: "shaft length",
      signed_nominal_mm: -40,
      worst_case_upper_excursion_mm: 0.025,
      worst_case_lower_excursion_mm: 0.08,
      rss_upper_sq_mm2: 0.0006250000000000001,
      rss_lower_sq_mm2: 0.0064,
    },
  ],
  not_checked: [
    "RSS assumes all contributors are independent and normally distributed — this is often not the case. Use worst-case for safety-critical applications.",
    "Geometric tolerances (flatness, squareness, parallelism) that contribute to the assembly gap are not modelled — add them as explicit contributors if needed.",
  ],
} as const;
