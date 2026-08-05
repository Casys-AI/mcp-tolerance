# @casys/mcp-tolerance

ISO 286-1:2010 dimensional tolerance oracle — an MCP server for computing hole and
shaft deviation limits, IT grade values, tolerance class lookups, and dimension chain
stackup from the normative formulas and tables.

**Target**: makers and small engineering offices that need to verify dimensional
fits (clearance, transition, interference) before machining or printing parts.

## Tools

### `tolerance_fit`

Computes hole/shaft deviation limits and fit type for a **hole-basis** designation
pair at a given nominal diameter. Restricted to hole letter `H`.

**Input**:
- `hole_code` — hole-basis only: `"H7"`, `"H6"`, `"H8"` … (only `H` is supported;
  for other hole letters use `tolerance_fit_analyze`)
- `shaft_code` — e.g. `"g6"`, `"p6"`, `"h6"`, `"js9"` (supported letters:
  c, d, e, f, g, h, js, k, m, n, p, r, s, u)
- `nominal_diameter_mm` — nominal size in mm, `(0, 500]`

**Output** (all deviations in µm):
- `hole.EI_um`, `hole.ES_um`, `hole.IT_um`
- `shaft.ei_um`, `shaft.es_um`, `shaft.IT_um`
- `fit.type` — `"clearance"`, `"transition"`, or `"interference"`
- `fit.max_clearance_um`, `fit.min_clearance_um`
- `fit.max_interference_um`, `fit.min_interference_um`
- `provenance` — always `"ISO 286-1:2010 formulas/tables"`
- `not_checked` — explicit list of what this tool does not verify

**Validated cross-checks** (nominal 25 mm, range 18–30):
- H7/g6 → hole 0/+21 µm, shaft −7/−20 µm, clearance 7–41 µm
- H7/p6 → shaft +22/+35 µm, interference 1–35 µm
- H7/h6 → clearance 0–34 µm (reference fit)

### `tolerance_it`

Returns the fundamental tolerance IT value in µm for a grade (1–18) and nominal
diameter.

- Grades 1–12: ISO 286-1:2010 Table 1 (tabulated normative values).
- Grades 13–18: tolerance factor formula `i = 0.45×D^(1/3) + 0.001×D` with ISO
  tiered rounding.

### `tolerance_limits`

Resolves a single ISO 286-1 tolerance class designation to upper and lower deviations
in µm. Accepts both holes (uppercase letter) and shafts (lowercase letter).

**Input**:
- `tolerance_class` — e.g. `"H7"`, `"g6"`, `"JS9"`, `"P6"`, `"r6"`
- `nominal_diameter_mm` — nominal size in mm, `(0, 500]`

**Output** (all in µm): `upper_um`, `lower_um`, `IT_um`, `fundamental_deviation_um`,
`designation_type` (`"hole"` or `"shaft"`), `diameter_range_mm`, `provenance`,
`not_checked`.

Supported hole letters: C, D, E, F, G, H, JS, K, M, N, P, R, S.
Supported shaft letters: c, d, e, f, g, h, js, k, m, n, p, r, s, u.

### `tolerance_fit_analyze`

Analyses a hole/shaft fit by tolerance class pair. Supports both the hole-basis system
(any hole letter C–S) and the shaft-basis system (base shaft `h` with non-H hole
letters).

**Input**:
- `hole_class` — hole designation, e.g. `"H7"`, `"G7"`, `"K6"`, `"P7"`
- `shaft_class` — shaft designation, e.g. `"g6"`, `"h6"`, `"n6"`, `"r6"`
- `nominal_diameter_mm` — nominal size in mm, `(0, 500]`

**Output** (all deviations in µm): hole `EI_um`/`ES_um`/`IT_um`, shaft `ei_um`/`es_um`/
`IT_um`, `clearance_min_um` (EI\_hole − es\_shaft), `clearance_max_um` (ES\_hole −
ei\_shaft), `fit_type`, `provenance`, `not_checked`.

### `tolerance_stackup`

Worst-case and RSS (Root Sum Square) dimension chain stackup.

**Input**: `contributors` — array of objects each with:
- `name` — label
- `nominal_mm` — nominal dimension
- `plus_um` — upper tolerance offset in µm (≥ 0)
- `minus_um` — lower tolerance offset in µm (≥ 0)
- `direction` — `+1` (adds to assembly gap) or `−1` (subtracts)

**Output** (all in mm): `nominal_mm`, `worst_case_min_mm`, `worst_case_max_mm`,
`rss_min_mm`, `rss_max_mm`, `contributor_count`, `provenance`, `not_checked`.

Worst-case guarantees 100 % assembly conformance. RSS is a statistical estimate —
see `not_checked` for assumptions.

## Usage

```bash
deno task serve        # starts on http://127.0.0.1:3019/mcp
deno task test         # run all tests
deno task release:check  # fmt + check + lint + test
deno run --allow-read scripts/check_iso286_fixtures.ts  # normative cross-check (203 values)
```

## Docker

Park port: **3019**. Engine is TypeScript-only (ISO 286-1 formulas) — no system
binaries required.

```bash
# Build (multi-arch; arm64 shown)
docker build --platform linux/arm64 -t mcp-tolerance:local .

# Run
docker run -d --name mcp-tolerance -p 3019:3019 mcp-tolerance:local

# Smoke test — stateless MCP 2026-07-28
curl -s -X POST http://127.0.0.1:3019/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/list' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}'
```

The server default bind is `127.0.0.1`; the image CMD overrides it to `0.0.0.0`
via the supported `--hostname` flag so the port is reachable from the host.

## No verdict

These tools compute limits. They never declare a fit suitable or a part conformant.
The caller assesses whether a computed fit meets the application requirements.

## What this server does NOT check

Every tool result carries a `not_checked` field enumerating:
- Surface roughness and form tolerances (circularity, cylindricity)
- Geometric tolerances (perpendicularity, parallelism)
- Thermal expansion effects
- Assembly forces and press-fit stresses for interference fits
- Nominal diameters above 500 mm or at/below 0 mm
- Sub-ranges within the 13 main ISO 286-1 ranges (e.g. 50–65 / 65–80 within
  50–80 mm): shaft letters r, s, u may deviate 1–6 µm from sub-range tabulated
  values
- For `tolerance_stackup`: the RSS result does NOT guarantee 100 % conformance;
  geometric tolerances (flatness, squareness) not modelled unless added explicitly

## Provenance

All formulas and table values reference ISO 286-1:2010 explicitly:
- IT grades 1–4: Table 1 (tabulated).
- IT grades 5–12: Table 1 (tabulated; normative authority; formula diverges for
  small diameters — e.g. IT6 @ 0–3 mm: formula gives 5 µm, table gives 6 µm).
- IT grades 13–18: §B.2 formula `i = 0.45×D^(1/3) + 0.001×D` with ISO tiered
  rounding.
- Shaft clearance letters (c, d, e, f, g): Table 2 (tabulated es).
- Shaft reference letter h: es = 0 by definition.
- Shaft letter js: symmetric ±IT/2.
- Shaft interference/transition letters (k, m, n, p, r, s, u): Table 3 (tabulated ei).
- Hole letters C–G: EI = −es\_shaft (clearance holes).
- Hole letter H: EI = 0 (reference hole).
- Hole letters K–S: ES = −ei\_shaft (transition/interference holes).

The normative cross-check script (`scripts/check_iso286_fixtures.ts`) verifies 203
values from ISO 286-1:2010 Tables 1–3 against the engine; it exits 1 on any divergence.
