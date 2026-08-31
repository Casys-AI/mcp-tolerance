# MCP Tolerance Server — stateless HTTP, port 3019
# Engine: TypeScript-only ISO 286-1 formulas, no external binaries.
# Base: denoland/deno:debian (multi-arch, amd64 + arm64), pinned for this release.
FROM denoland/deno:debian@sha256:2014dc167ece617ef7e7ba40631ac2234c59e75ce693e7cc2dc2602b3c87859d

WORKDIR /app

# -- dependency layer (invalidates only when lock or deno.json change) --
COPY deno.json deno.lock ./
COPY server.ts mod.ts ./
COPY src/ ./src/
COPY docker-entrypoint.sh ./

# Pre-cache all transitive deps using the committed lock file.
# --frozen ensures we never silently drift from the committed lock.
RUN deno cache --frozen server.ts

EXPOSE 3019

# --hostname=0.0.0.0 is a supported CLI option (server.ts:parseCli).
# Default bind is 127.0.0.1 — override here is legitimate, not a patch.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["http"]
