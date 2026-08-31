import { join } from "@std/path";
import {
  buildToleranceViewers,
  TOLERANCE_VIEWER_BUILDS,
  versionedViewerPath,
} from "./build.ts";

const temporaryDirectory = await Deno.makeTempDir({
  prefix: "mcp-tolerance-view-freshness-",
});

try {
  await buildToleranceViewers(temporaryDirectory);
  for (const build of TOLERANCE_VIEWER_BUILDS) {
    const versionedPath = versionedViewerPath(build.viewer);
    const rebuiltPath = join(temporaryDirectory, build.viewer, "index.html");
    const [versioned, rebuilt] = await Promise.all([
      Deno.readFile(versionedPath),
      Deno.readFile(rebuiltPath),
    ]);
    if (!equalBytes(versioned, rebuilt)) {
      throw new Error(
        `The versioned ${build.viewer} is stale: an audited local rebuild does ` +
          `not match it byte-for-byte (versioned ${await sha256(versioned)}, ` +
          `rebuilt ${await sha256(
            rebuilt,
          )}). Run deno task build:ui and review ` +
          "the generated HTML.",
      );
    }
    console.log(
      `[${build.viewer}] versioned bundle is current (${await sha256(
        versioned,
      )})`,
    );
  }
} finally {
  await Deno.remove(temporaryDirectory, { recursive: true });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((byte, index) => byte === right[index]);
}

async function sha256(value: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(value.byteLength);
  new Uint8Array(copy).set(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copy));
  return `sha256:${
    Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }`;
}
