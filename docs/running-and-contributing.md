# Running and contributing

## Transports

The server supports native stdio and stateless HTTP. It binds HTTP to `127.0.0.1:3019`
by default; use `--hostname`, `--port`, `MCP_HOSTNAME`, or `MCP_PORT` to override it.

From a checkout:

```bash
deno task serve
deno run --allow-all server.ts --stdio
```

The published JSR entry includes the viewer HTML. Because those resources are resolved
from JSR only when a client reads them, a JSR-hosted server needs runtime network
permission for `jsr.io` if MCP Apps will be used.

## Containers

Build and exercise both modes locally:

```bash
docker build -t mcp-tolerance:local .
docker run --rm -p 127.0.0.1:3019:3019 mcp-tolerance:local http
docker run --rm -i mcp-tolerance:local stdio
```

Official tagged images are published at `ghcr.io/casys-ai/mcp-tolerance`. Release
workflows build `linux/amd64` and `linux/arm64`, smoke the local candidate, publish the
OCI index, then smoke the published image by immutable digest. Inspect and pin that
digest for a reproducible deployment.

## Viewer builds

Viewer builds use the split MCP View packages from `Casys-AI/mcp-server` at commit
`342c1b7456c011d3f21cad988f9dde23bcbecae0` (View `0.9.3`, components `0.7.1`, contracts
`0.1.0`):

```bash
export MCP_VIEW_LOCAL_ROOT=/absolute/path/to/mcp-server/packages/view
export MCP_VIEW_CONTRACTS_LOCAL_ROOT=/absolute/path/to/mcp-server/packages/view-contracts
export MCP_VIEW_COMPONENTS_LOCAL_ROOT=/absolute/path/to/mcp-server/packages/view-components

deno task build:ui
deno task check:ui:bundle
```

There is no registry fallback for a viewer build. The committed HTML must be rebuilt
after changing TSX, CSS, model adapters, or MCP View inputs.

The shared `startPreactSurfaceApp` lifecycle receives recorded data through
`viewerSession`. Each resource keeps its existing strict envelope and projection
fingerprint check; rejected sessions display an error state. The limits, fit, and
stackup components remain the App-owned surfaces.

The README capture uses the exact `H7/g6 @ 25 mm` result emitted by
`tolerance_fit_analyze` and the committed `fit-viewer` bundle in a minimal MCP Apps host
harness. Its visible caption deliberately identifies it as fixture data rather than a
Digital Thread record.

## Validation

```bash
deno task fmt
deno task check
deno task lint
deno task check:iso286-fixtures
deno task test
deno task check:ui:bundle
deno task smoke:stdio
```

`deno task release:check` runs that release gate. The native calculation engine is pure
TypeScript and needs no solver or provider credentials.

## Deployment safety

HTTP authentication and TLS are not enabled by the default server. Keep local ports on
loopback. Before shared or internet-facing deployment, put authentication, TLS, request
limits, and network policy in front of the server. CORS is not authentication.

Casys Digital Thread may deploy the image as a digest-pinned engineering provider. This
repository owns the calculation contract. Digital Thread owns operation registration,
orchestration, authorization, persistence, and review state. An MCP response is not
automatically a canonical Thread document, captured evidence, approval, or manufacturing
verdict.

Report vulnerabilities through the private route in [SECURITY.md](../SECURITY.md).
