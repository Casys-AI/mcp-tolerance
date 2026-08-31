# @casys/mcp-tolerance

Deterministic, read-only ISO 286-1:2010 fit calculations and 1D tolerance stack-ups,
exposed through MCP and as a Deno library.

Give the server `H7/g6` at a nominal diameter of 25 mm and it returns:

- hole H7: 25.000 to 25.021 mm (`EI = 0 µm`, `ES = +21 µm`);
- shaft g6: 24.980 to 24.993 mm (`ei = -20 µm`, `es = -7 µm`);
- resulting clearance: 0.007 to 0.041 mm, classified as a clearance fit.

The server performs calculations. It does not inspect a manufactured part, choose a fit
for an application, or declare a design conformant. Hosts that support MCP Apps can
render each visual tool result in a small, provider-owned viewer
(`ui://mcp-tolerance/limits-viewer`, `ui://mcp-tolerance/fit-viewer`,
`ui://mcp-tolerance/stackup-viewer`). Text clients keep the same `content` and
`structuredContent` contracts. The server starts even when the UI dist is absent.

## Quick start

### Stateless HTTP from JSR

Version 0.3.2 starts on loopback by default. Package and server runtime identities are
aligned at 0.3.2:

```bash
deno run \
  --allow-net=127.0.0.1:3019 \
  --allow-env \
  --allow-read=mcp-server.yaml \
  jsr:@casys/mcp-tolerance@0.3.2/server \
  --port=3019
```

Direct HTTP uses the stateless MCP `2026-07-28` wire contract. It has no `initialize`
exchange or session ID. This request runs the example above:

```bash
curl -sS -X POST http://127.0.0.1:3019/mcp \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/call' \
  -H 'Mcp-Name: tolerance_fit' \
  --data-binary '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "tolerance_fit",
      "arguments": {
        "hole_code": "H7",
        "shaft_code": "g6",
        "nominal_diameter_mm": 25
      },
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  }'
```

The `structuredContent` payload includes the selected diameter range and the full
limits:

```json
{
  "diameter_range_mm": [18, 30],
  "hole": { "EI_um": 0, "ES_um": 21, "IT_um": 21 },
  "shaft": { "ei_um": -20, "es_um": -7, "IT_um": 13 },
  "fit": {
    "type": "clearance",
    "min_clearance_um": 7,
    "max_clearance_um": 41
  }
}
```

### Published 0.3.2 Docker image

The published multi-architecture 0.3.2 release image is available for `linux/amd64`
and `linux/arm64`. Its entrypoint is
`./docker-entrypoint.sh` and its `CMD` is `http`, so this command starts the stateless
HTTP transport:

```bash
docker run --rm \
  -p 127.0.0.1:3019:3019 \
  ghcr.io/casys-ai/mcp-tolerance@sha256:c7c67ba5907aa20bef5666dbdad21d4c1d652db4b9a0653d989d03e0d4ecdc95 \
  http
```

`latest` is a mutable convenience tag, not authority for a version or capability.

### stdio for desktop MCP clients

Version 0.3.2 provides native stdio and handles legacy `2025-06-18` `initialize` clients
directly. A desktop MCP client can run the JSR server without an internal HTTP child:

```json
{
  "mcpServers": {
    "tolerance": {
      "command": "deno",
      "args": [
        "run",
        "--allow-env",
        "--allow-read=mcp-server.yaml",
        "jsr:@casys/mcp-tolerance@0.3.2/server",
        "--stdio"
      ]
    }
  }
}
```

The same published image runs native stdio when `stdio` is passed to Docker. It
overrides the image's `CMD http`; it does not start an HTTP child:

```json
{
  "mcpServers": {
    "tolerance": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "ghcr.io/casys-ai/mcp-tolerance@sha256:c7c67ba5907aa20bef5666dbdad21d4c1d652db4b9a0653d989d03e0d4ecdc95",
        "stdio"
      ]
    }
  }
}
```

To build an image from a checkout for local development instead:

```bash
docker build -t mcp-tolerance:local .

# HTTP, exposed only on host loopback
docker run --rm -p 127.0.0.1:3019:3019 mcp-tolerance:local http

# stdio
docker run --rm -i mcp-tolerance:local stdio
```

### Deno library

The calculation engine and tool catalog are also exported without starting a server. To
install version 0.3.2:

```bash
deno add jsr:@casys/mcp-tolerance@0.3.2
```

```ts
import { computeFit, fundamentalTolerance } from "@casys/mcp-tolerance";

console.log(fundamentalTolerance(7, 25)); // 21 µm
console.log(computeFit("H7", "g6", 25).fit); // clearance, 7–41 µm
```

## Capability map

| Tool                    | Use it for                                                                         | Main result                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tolerance_it`          | IT grade 1–18 at a nominal diameter in `(0, 500]` mm                               | `IT_um` and selected diameter range                                                   |
| `tolerance_limits`      | One supported hole or shaft class, such as `H7`, `g6`, `JS9`, or `P6`              | Upper/lower deviations, IT width, and fundamental deviation in µm                     |
| `tolerance_fit`         | A base-hole `H` class paired with a supported shaft class                          | Hole/shaft deviations, fit type, and clearance/interference extremes                  |
| `tolerance_fit_analyze` | Any supported uppercase hole class paired with any supported lowercase shaft class | Signed minimum/maximum clearance and fit type                                         |
| `tolerance_stackup`     | A linear 1D chain with bilateral or asymmetric contributor bounds                  | Aggregate nominal, worst-case interval, RSS interval, and per-contributor terms in mm |

The tools have closed input/output schemas and read-only, idempotent MCP annotations.
Every result includes `provenance`, `not_checked`, and an empty `violations` array.
`violations` stays empty because these tools accept no application threshold against
which to render a pass/fail verdict.

### Supported ISO 286 positions

- Hole positions: `C`, `D`, `E`, `F`, `G`, `H`, `JS`, `K`, `M`, `N`, `P`, `R`, `S`.
- Shaft positions: `c`, `d`, `e`, `f`, `g`, `h`, `js`, `k`, `m`, `n`, `p`, `r`, `s`,
  `u`.
- IT grades: 1–18.
- Nominal diameters: greater than 0 mm and at most 500 mm.

`tolerance_fit` deliberately accepts only the base-hole position `H`. Use
`tolerance_fit_analyze` for the other supported hole positions, including shaft-basis
examples such as `G7/h6`. The extended tool mathematically combines any supported pair;
it does not say that the pair is preferred, commonly manufactured, or suitable for the
intended load, material, process, or assembly method.

### Units and signs

- Nominal diameters and stack-up nominal dimensions are entered in millimetres.
- ISO fit deviations and contributor tolerance offsets are entered or returned in
  micrometres (`1 µm = 0.001 mm`).
- For holes, `EI` is the lower deviation and `ES` is the upper deviation.
- For shafts, `ei` is the lower deviation and `es` is the upper deviation.
- An absolute size limit is `nominal_diameter_mm + deviation_um / 1000`.
- Signed clearance is `hole size - shaft size`: positive is clearance and negative is
  interference.
- Diameter ranges are lower-exclusive and upper-inclusive: `[18, 30]` means
  `18 < diameter <= 30` mm.

For `tolerance_fit`, the clearance and interference fields are two signed views of the
same extremes. A negative `max_interference_um` in a clearance fit does not mean that
interference occurs. `fit.type` or the signed `clearance_min_um` / `clearance_max_um`
from `tolerance_fit_analyze` are usually the clearest fields to consume.

## 1D stack-up example

Each contributor supplies a nominal dimension in mm, non-negative upper and lower
offsets in µm, and a direction. `+1` adds to the assembly result; `-1` subtracts from
it.

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

This produces a nominal gap of 0.200 mm, a worst-case interval of 0.120–0.270 mm, and an
RSS interval of approximately 0.142–0.254 mm. Asymmetric tolerances are handled on their
respective upper and lower sides. The same terms that form those aggregates are returned
in `contributor_breakdown`, in input order:

```json
{
  "nominal_mm": 0.2,
  "contributor_count": 2,
  "worst_case_min_mm": 0.12,
  "worst_case_max_mm": 0.27,
  "contributor_breakdown": [
    {
      "name": "housing depth",
      "signed_nominal_mm": 10,
      "worst_case_upper_excursion_mm": 0.05,
      "worst_case_lower_excursion_mm": 0.05,
      "rss_upper_sq_mm2": 0.0025,
      "rss_lower_sq_mm2": 0.0025
    },
    {
      "name": "component stack",
      "signed_nominal_mm": -9.8,
      "worst_case_upper_excursion_mm": 0.02,
      "worst_case_lower_excursion_mm": 0.03,
      "rss_upper_sq_mm2": 0.0004,
      "rss_lower_sq_mm2": 0.0009
    }
  ]
}
```

Summing `signed_nominal_mm` recovers `nominal_mm`. Adding the upper excursions to the
nominal recovers `worst_case_max_mm`; subtracting the lower excursions recovers
`worst_case_min_mm`. The RSS bounds are `nominal_mm ± sqrt(Σ rss_*_sq_mm2)` on each
side. Direction `-1` maps `minus_um` onto the assembly upper side and `plus_um` onto the
assembly lower side. The array is not a sensitivity ranking and does not include
percentage shares.

The worst-case interval covers every combination only if every supplied dimension stays
inside its stated bounds and the linear 1D chain contains every material contributor. It
is not by itself a guarantee of assembly conformance: the caller must compare the result
with an explicit acceptance interval.

RSS is a statistical estimate. Its interpretation requires independent, centred
processes and tolerance offsets expressed with a consistent sigma convention. The tool
does not infer distributions, covariance, process capability, confidence, yield, or a
pass/fail threshold, and it does not run Monte Carlo simulation.

## Boundaries

The fit tools calculate size tolerances only. They do not model or verify:

- actual measurements or inspection uncertainty;
- surface roughness, circularity, cylindricity, flatness, squareness, parallelism, or
  other geometric tolerances;
- temperature-dependent expansion;
- material behaviour, lubrication, assembly force, press-fit stress, retained stress,
  wear, or fatigue;
- whether a class pair is a preferred ISO fit or is appropriate for an application;
- nominal diameters outside `(0, 500]` mm; or
- ISO positions outside the supported lists above.

IT grades use the 13 main diameter ranges from ISO 286-1:2010 Table 1. Shaft position
`c` independently resolves the finer nominal-size sub-ranges in Table 4; positions `r`,
`s`, and `u` do so in Table 5. The returned `diameter_range_mm` remains the Table 1
IT-grade range, rather than the finer fundamental-deviation range.

The stack-up tool is scalar and linear. It has no vector loops, datum scheme, assembly
sequence, sensitivity ranking, geometric model, or automatic link from an ISO fit result
into a chain. `contributor_breakdown` reports each input contributor's signed nominal
and the worst-case/RSS terms used to form the aggregates, in input order; it is not a
ranking. Add every relevant effect as an explicit contributor or use a more complete
analysis method.

This project implements the 2010 edition named above; it does not claim to represent a
newer edition. It is not an official ISO publication or certification service. For
regulated or safety-critical work, verify the calculation independently against the
licensed standard and the governing design requirements.

## Deployment safety

The calculation handlers are deterministic TypeScript. They do not call an LLM, execute
user-supplied code, invoke a native solver, modify files, or contact an upstream
service.

HTTP authentication and TLS are not enabled by this repository's default server
configuration. The Deno entry point binds to `127.0.0.1`; the container listens on
`0.0.0.0` internally so Docker can publish it. Keep the host mapping on loopback for
local use. Put authentication, TLS, request limits, and network policy in front of the
server before any shared or internet-facing deployment. CORS is not authentication.

Security reports: see [SECURITY.md](SECURITY.md).

## Relationship to Casys Digital Thread

Casys Digital Thread deploys this server's published image as an optional, digest-pinned
engineering provider on port 3019. This repository owns the calculation contract only.
Digital Thread owns operation registration, orchestration, authorization, persistence,
and review state.

An MCP response from this server is therefore not automatically a canonical Thread
document, captured evidence, an approved decision, or a manufacturing verdict. The
provider can also be used independently of Digital Thread.

## Provenance and verification

The implementation references ISO 286-1:2010 as follows:

- IT1–IT12: Table 1 values stored by main diameter range;
- IT13–IT18: the tolerance-factor formula `i = 0.45 * D^(1/3) + 0.001 * D`, using the
  selected range's geometric-mean diameter and tiered rounding;
- shaft positions `c`–`g`: tabulated upper deviations from Table 4, with Table 4
  sub-range lookup for `c`;
- shaft `h`: `es = 0`, and `js`: split symmetrically around zero;
- shaft positions `k`, `m`, `n`, `p`, `r`, `s`, `u`: tabulated lower deviations from
  Table 5, with Table 5 sub-range lookup for `r`, `s`, and `u`;
- hole `H`: `EI = 0`, and `JS`: split symmetrically around zero;
- hole positions `C`–`G`: derived from the corresponding shaft upper deviation; and
- hole positions `K`, `M`, `N`, `P`, `R`, `S`: derived from the corresponding shaft
  lower deviation.

The repository fixture check compares stored expectations transcribed from Tables 1, 4,
and 5 with the calculation engine. It fails if an engine table row, cell, or sub-range
is missing from the fixture, if a result differs, or if it performs no checks:

```bash
deno run --allow-read scripts/check_iso286_fixtures.ts
```

For development from a checkout:

```bash
deno task serve          # http://127.0.0.1:3019/mcp
deno task test
deno task release:check  # format + type-check + lint + tests
```

MIT licensed. See [LICENSE](LICENSE).
