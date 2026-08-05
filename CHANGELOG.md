# Changelog

All notable changes to `@casys/mcp-tolerance` are documented here.

## [0.1.0] — 2026-08-05

### Added

- `tolerance_fit` — compute hole and shaft deviation limits (EI/ES in µm, ei/es in µm)
  and fit type (clearance/transition/interference) for a hole/shaft tolerance designation
  pair at a given nominal diameter, per ISO 286-1:2010. Supported hole letters: H.
  Supported shaft letters: d, e, f, g, h, js, k, m, n, p, s, u.
  All results carry an explicit `provenance: "ISO 286-1:2010 formulas/tables"` field.

- `tolerance_it` — return the fundamental tolerance IT value in µm for a given grade
  (1–18) and nominal diameter (0, 500] mm. Grades 5–18 use the tolerance factor formula
  i = 0.45×D^(1/3) + 0.001×D; grades 1–4 are from ISO 286-1:2010 Table 1.

- Engine cross-validation documented in `src/api/iso286.ts` source header:
  - IT7 @ 25 mm = 21 µm (formula: 16 × 1.304 = 20.87 → 21) ✓
  - IT6 @ 25 mm = 13 µm ✓
  - es_g @ 25 mm = −7 µm (formula: −2.5 × 23.238^0.34 = −7.28 → −7) ✓
  - H7/g6 @ 25 mm: hole 0/+21 µm, shaft −7/−20 µm, clearance 7–41 µm ✓
  - ei_p @ 25 mm = +22 µm (ISO 286-1:2010 Table 3) ✓
  - H7/p6 @ 25 mm: shaft +22/+35 µm, interference 1–35 µm ✓

- Stateless HTTP MCP server on port 3019, protocol `2026-07-28`, transport matching
  the Casys engineering toolchain (`mcp-server@0.24.1`).

- Pure TypeScript engine — no external binaries, no subprocess, no LLM. All formulas
  are implemented in `src/api/iso286.ts` with inline provenance references.

- 30 unit and integration tests; `deno task release:check` passes.

### Engine provenance

- IT grades 1–4: ISO 286-1:2010 Table 1 (tabulated).
- IT grades 5–18: ISO 286-1:2010 §B.2 formula, rounded to nearest integer.
- Shaft clearance letters (d/e/f/g/h): ISO 286-1:2010 §B.3 formulas.
- Shaft letter n: §B.3 formula ei = round(5 × D^0.34) for D > 3 mm.
- Shaft letters k/m/p/s/u: ISO 286-1:2010 Table 3 (tabulated, 13 diameter ranges).
- Shaft letter js: symmetric ±IT/2.
