# Technical reference

`@casys/mcp-tolerance` is a deterministic TypeScript calculation provider. It does not
call an LLM, execute user code, contact an upstream service, or infer a design
requirement.

## Result families

| Operation               | Input intent                                                                | Returned evidence                                                             |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `tolerance_it`          | Fundamental tolerance at a nominal diameter                                 | IT width and selected diameter range                                          |
| `tolerance_limits`      | One supported hole or shaft class                                           | Upper/lower deviation, IT width, and fundamental deviation                    |
| `tolerance_fit`         | Base-hole `H` class with a supported shaft class                            | Member limits, fit classification, and signed clearance/interference extremes |
| `tolerance_fit_analyze` | Any supported uppercase hole class with any supported lowercase shaft class | Member limits, fit classification, and signed clearance range                 |
| `tolerance_stackup`     | Linear chain of bounded contributors                                        | Nominal, worst-case and RSS intervals, plus contributor terms                 |

Inputs and outputs use closed schemas. Results include `provenance`, `not_checked`, and
an empty `violations` array. `violations` stays empty because the provider accepts no
application acceptance threshold against which to form a verdict.

## Supported ISO 286 positions

- Hole positions: `C`, `D`, `E`, `F`, `G`, `H`, `JS`, `K`, `M`, `N`, `P`, `R`, `S`.
- Shaft positions: `c`, `d`, `e`, `f`, `g`, `h`, `js`, `k`, `m`, `n`, `p`, `r`, `s`,
  `u`.
- IT grades: 1–18.
- Nominal diameters: greater than 0 mm and at most 500 mm.

`tolerance_fit` deliberately accepts only the base-hole position `H`. Use
`tolerance_fit_analyze` for other supported hole positions, including shaft-basis
examples such as `G7/h6`. Mathematical support does not mean that a pair is preferred or
suitable for a load, material, process, or assembly method.

## Units, signs, and ranges

- Nominal diameters and stack-up nominal dimensions use millimetres.
- ISO deviations and contributor offsets use micrometres (`1 µm = 0.001 mm`).
- For holes, `EI` is lower and `ES` is upper.
- For shafts, `ei` is lower and `es` is upper.
- Absolute size is `nominal_diameter_mm + deviation_um / 1000`.
- Signed clearance is `hole size - shaft size`: positive means clearance; negative means
  interference.
- Diameter ranges are lower-exclusive and upper-inclusive. `[18, 30]` means
  `18 < diameter <= 30` mm.

The clearance and interference fields returned by `tolerance_fit` are signed views of
the same extremes. A negative `max_interference_um` in a clearance fit does not mean
that interference occurs. Prefer the literal fit classification or the signed
minimum/maximum clearance.

## 1D stack-up semantics

Each contributor supplies a nominal dimension in mm, non-negative `plus_um` and
`minus_um` offsets, and a direction. `+1` adds to the assembly result; `-1` subtracts
from it.

```json
{
  "contributors": [
    {
      "name": "housing depth",
      "nominal_mm": 10,
      "plus_um": 50,
      "minus_um": 50,
      "direction": 1
    },
    {
      "name": "component stack",
      "nominal_mm": 9.8,
      "plus_um": 30,
      "minus_um": 20,
      "direction": -1
    }
  ]
}
```

This chain has a nominal gap of 0.200 mm and a worst-case interval of 0.120–0.270 mm.
The returned `contributor_breakdown` preserves input order and contains the signed
nominal and worst-case/RSS terms used in the aggregates. It is reconstructable
accounting, not a sensitivity ranking.

Worst-case covers every combination only when every supplied dimension stays inside its
stated bounds and the chain includes every material contributor. RSS is a statistical
estimate requiring independent, centred processes and a consistent sigma convention. The
provider does not infer distributions, covariance, process capability, confidence,
yield, or an acceptance threshold.

## Formula and table provenance

The implementation references ISO 286-1:2010 as follows:

- IT1–IT12: Table 1 values by main diameter range.
- IT13–IT18: `i = 0.45 * D^(1/3) + 0.001 * D`, using the selected range's geometric-mean
  diameter and the documented tiered rounding.
- Shaft `c`–`g`: Table 4 upper deviations, including the finer `c` sub-ranges.
- Shaft `h`: `es = 0`; shaft `js`: symmetric around zero.
- Shaft `k`, `m`, `n`, `p`, `r`, `s`, `u`: Table 5 lower deviations, including the finer
  `r`, `s`, and `u` sub-ranges.
- Hole `H`: `EI = 0`; hole `JS`: symmetric around zero.
- Hole `C`–`G`: derived from the corresponding shaft upper deviation.
- Hole `K`, `M`, `N`, `P`, `R`, `S`: derived from the corresponding shaft lower
  deviation.

The committed fixture gate cross-checks expectations transcribed from Tables 1, 4, and 5
against the engine and fails closed on missing rows, cells, sub-ranges, or divergent
values:

```bash
deno task check:iso286-fixtures
```

## MCP App contracts

The exported `view-app-manifest` declares these whole-view resources:

- `ui://mcp-tolerance/limits-viewer`
- `ui://mcp-tolerance/fit-viewer`
- `ui://mcp-tolerance/stackup-viewer`

Each surface owns one semantic business object. Identity, readings, scope notes, and
provenance stay together. There is no artificial navigation or inferred verdict.
Recorded projections are accepted only through their exact read-only
`viewer.session.apply` schema and projection fingerprint.

## Boundaries

The fit calculations do not model or verify actual measurements, inspection uncertainty,
surface roughness, form or geometric tolerances, thermal expansion, material behaviour,
lubrication, assembly force, press-fit stress, retained stress, wear, or fatigue.

The stack-up calculation is scalar and linear. It has no vector loop, datum scheme,
assembly sequence, geometric model, automatic link from a fit result, or Monte Carlo
simulation. Add every relevant effect explicitly or use a more complete analysis method.

The project implements the named 2010 edition. It is not an official ISO publication or
certification service. For regulated or safety-critical work, verify the calculation
independently against the licensed standard and the governing design requirements.
