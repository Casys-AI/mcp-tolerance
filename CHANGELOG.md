# Changelog

All notable changes to `@casys/mcp-tolerance` are documented here.

## Unreleased

- Optional MCP Apps for `tolerance_limits`/`tolerance_it`, `tolerance_fit`/
  `tolerance_fit_analyze`, and `tolerance_stackup`. Each resource is a bounded
  result card with a small component catalogue. Tool names, schemas, text
  `content`, and `structuredContent` are unchanged aside from
  `_meta.ui.resourceUri`. The server still starts when UI dist is absent.

## 0.3.2 — 2026-08-28

- Shaft position `c` now resolves the ISO 286-1:2010 Table 4 nominal-size sub-ranges
  instead of reusing a containing Table 1 range value. Hole position `C` follows the
  corrected inverse relation.
- Shaft positions `r`, `s`, and `u` now resolve the ISO 286-1:2010 Table 5 nominal-size
  sub-ranges instead of reusing a containing Table 1 range value.
- Corrected the shaft fundamental-deviation provenance from Table 3 to Table 5.
- The ISO 286 fixture cross-check is an explicit, fail-closed release gate: it rejects a
  missing engine table row, cell, or sub-range and covers `C`/`c`, `R7`, and `S7`
  boundary regressions.

## 0.3.1 — 2026-08-27

- Stdio now uses the native era-aware MCP transport directly. Legacy `2025-06-18`
  initialization and an end-to-end `tolerance_it` call are covered.

## 0.3.0 — 2026-08-24

- `tolerance_stackup` now returns a required `contributor_breakdown` array in
  `structuredContent`. Each item preserves input order and reports `name`,
  `signed_nominal_mm`, non-negative `worst_case_upper_excursion_mm` /
  `worst_case_lower_excursion_mm`, and `rss_upper_sq_mm2` / `rss_lower_sq_mm2`. These
  are the same terms used to form the existing aggregate bounds. Aggregate fields and
  no-verdict semantics are unchanged.

## 0.2.0

- `scripts/stdio-shim.ts`: stdio → stateless-HTTP adapter. Classic-SDK stdio clients
  (Docker MCP Toolkit, desktop hosts) get `initialize` answered locally from
  `server/discover`; everything else is forwarded in the 2026-07-28 stateless envelope,
  which is the only revision the server accepts on the wire.
- `docker-entrypoint.sh`: the image now has two run modes — `http` (default, unchanged)
  and `stdio` (`docker run -i <image> stdio`).

## [0.1.0] — 2026-08-05

### Added

- `tolerance_fit` — compute hole and shaft deviation limits (EI/ES in µm, ei/es in µm)
  and fit type (clearance/transition/interference) for a **hole-basis** designation pair
  at a given nominal diameter, per ISO 286-1:2010. Hole letter restricted to `H`; use
  `tolerance_fit_analyze` for other hole letters. Supported shaft letters: c, d, e, f,
  g, h, js, k, m, n, p, r, s, u. All results carry an explicit
  `provenance: "ISO 286-1:2010 formulas/tables"` field.

- `tolerance_it` — return the fundamental tolerance IT value in µm for a given grade
  (1–18) and nominal diameter (0, 500] mm. Grades 1–12 are from ISO 286-1:2010 Table 1
  (tabulated normative values). Grades 13–18 use the tolerance factor formula i =
  0.45×D^(1/3) + 0.001×D with ISO tiered rounding.

- `tolerance_limits` — resolve a single ISO 286-1 tolerance class (hole or shaft) to
  upper/lower deviations, IT_um, and fundamental deviation in µm. Supports hole letters
  C, D, E, F, G, H, JS, K, M, N, P, R, S and shaft letters c, d, e, f, g, h, js, k, m,
  n, p, r, s, u.

- `tolerance_fit_analyze` — hole/shaft fit analysis supporting both the hole-basis and
  shaft-basis systems. Accepts any supported hole letter (C–S) paired with any shaft
  letter. Returns clearance_min_um (EI_hole − es_shaft), clearance_max_um (ES_hole −
  ei_shaft), and fit_type.

- `tolerance_stackup` — worst-case arithmetic and RSS (Root Sum Square) dimension chain
  stackup. Inputs: array of contributors with nominal_mm, plus_um, minus_um, direction
  (±1). Outputs: nominal_mm, worst_case_min/max_mm, rss_min/max_mm. Worst-case bounds
  every combination of the supplied intervals; RSS is statistical. Neither result is an
  acceptance verdict without a caller-declared threshold.

- Engine cross-validation against ISO 286-1:2010 Tables 1, 4, and 5:
  - IT6 @ 0–3 mm = 6 µm (formula gives 5 — table is normative) ✓
  - IT6 @ 3–6 mm = 8 µm (formula gives 7 — table is normative) ✓
  - IT7 @ 25 mm = 21 µm ✓
  - es_g @ 0–3 mm = −2 µm (formula gives −3 — table is normative) ✓
  - es_g @ 25 mm = −7 µm, shaft g6: ei = −20 µm ✓
  - H7/g6 @ 25 mm: hole 0/+21 µm, shaft −7/−20 µm, clearance 7–41 µm ✓
  - H7/p6 @ 25 mm: shaft +22/+35 µm, interference 1–35 µm ✓
  - G7/h6 @ 25 mm: hole +7/+28 µm, clearance 7–41 µm (shaft-basis) ✓
  - P7 @ 25 mm: ES = −22, EI = −43 µm ✓
  - n @ 80–120 mm: ei = 23 µm (formula gives 24 — table is normative) ✓
  - r @ 80–100 mm: ei = 51 µm ✓

- Normative cross-check script `scripts/check_iso286_fixtures.ts` — compares the
  committed Table 1, 4, and 5 fixtures with the engine and exits 1 on a divergence or
  incomplete fixture.

- Stateless HTTP MCP server on port 3019, protocol `2026-07-28`, transport matching the
  Casys engineering toolchain (`mcp-server@0.24.1`).

- Pure TypeScript engine — no external binaries, no subprocess, no LLM. All formulas and
  table values are in `src/api/iso286.ts` with inline provenance references.

- Unit and integration coverage; `deno task release:check` passes.

### Engine provenance

- IT grades 1–4: ISO 286-1:2010 Table 1 (tabulated).
- IT grades 5–12: ISO 286-1:2010 Table 1 (tabulated; normative authority over formula).
- IT grades 13–18: ISO 286-1:2010 §B.2 formula with tiered rounding per §B.2.
- Shaft clearance letters (c, d, e, f, g): ISO 286-1:2010 Table 4 (tabulated es).
- Shaft reference letter h: es = 0 by ISO definition.
- Shaft letter js: symmetric ±IT/2.
- Shaft transition/interference letters (k, m, n, p, r, s, u): ISO 286-1:2010 Table 5
  (tabulated ei).
- Hole letters derived by the ISO rule: EI_hole = −es_shaft (clearance C–G); ES_hole =
  −ei_shaft (interference/transition K–S).
