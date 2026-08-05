# @casys/mcp-tolerance

ISO 286-1:2010 dimensional tolerance oracle — an MCP server for computing hole and
shaft deviation limits, IT grade values, and fit types from the normative formulas
and tables.

**Target**: makers and small engineering offices that need to verify dimensional
fits (clearance, transition, interference) before machining or printing parts.

## Tools

### `tolerance_fit`

Computes hole/shaft deviation limits and fit type for a designation pair at a
given nominal diameter.

**Input**:
- `hole_code` — e.g. `"H7"` (currently only `H` is supported as hole letter)
- `shaft_code` — e.g. `"g6"`, `"p6"`, `"h6"`, `"js9"` (supported: d, e, f, g,
  h, js, k, m, n, p, s, u)
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

## Usage

```bash
deno task serve        # starts on http://127.0.0.1:3019/mcp
deno task test         # run all tests
deno task release:check  # fmt + check + lint + test
```

## No verdict

These tools compute limits. They never declare a fit suitable or a part conformant.
The caller assesses whether a computed fit meets the application requirements.

## Provenance

All formulas and table values reference ISO 286-1:2010 explicitly:
- IT grades 1–4: Table 1.
- IT grades 5–18: §B.2 formula.
- Shaft clearance letters: §B.3 formulas.
- Shaft interference letters (k/m/p/s/u): Table 3.
