import { dirname, fromFileUrl, join } from "@std/path";
import { withAuditedViewerDenoConfig } from "./local-modules.ts";

const here = dirname(fromFileUrl(import.meta.url));

export const TOLERANCE_VIEWER_BUILDS = [
  { entry: "limits-main.ts", viewer: "limits-viewer" },
  { entry: "fit-main.ts", viewer: "fit-viewer" },
  { entry: "stackup-main.ts", viewer: "stackup-viewer" },
] as const;

export function versionedViewerPath(viewer: string): string {
  return join(here, "..", "dist", viewer, "index.html");
}

export async function buildToleranceViewers(
  outputRoot = join(here, "..", "dist"),
): Promise<void> {
  await withAuditedViewerDenoConfig(async (configPath) => {
    const temporaryDirectory = await Deno.makeTempDir({
      prefix: "mcp-tolerance-viewers-",
    });
    try {
      const template = await Deno.readTextFile(join(here, "index.html"));
      const css = await Deno.readTextFile(join(here, "src", "styles.css"));
      for (const build of TOLERANCE_VIEWER_BUILDS) {
        const bundlePath = join(temporaryDirectory, `${build.viewer}.js`);
        const command = new Deno.Command(Deno.execPath(), {
          args: [
            "bundle",
            "--config",
            configPath,
            `--lock=${join(here, "deno.lock")}`,
            "--frozen",
            "--check",
            "--platform=browser",
            "--minify",
            join(here, "src", build.entry),
            "--output",
            bundlePath,
          ],
          stdout: "piped",
          stderr: "piped",
        });
        const result = await command.output();
        if (!result.success) {
          throw new Error(
            `Tolerance ${build.viewer} build failed:\n${
              new TextDecoder().decode(result.stderr)
            }`,
          );
        }
        const js = await Deno.readTextFile(bundlePath);
        const html = template
          .replace("/* STYLES_PLACEHOLDER */", () => css)
          .replace("/* BUNDLE_PLACEHOLDER */", () => js)
          .replaceAll(/[ \t]+(?=\r?\n)/g, "");
        const output = join(outputRoot, build.viewer, "index.html");
        await Deno.mkdir(dirname(output), { recursive: true });
        await Deno.writeTextFile(output, html);
        console.log("[build:ui] wrote " + output);
      }
    } finally {
      await Deno.remove(temporaryDirectory, { recursive: true });
    }
  });
}

if (import.meta.main) {
  await buildToleranceViewers();
}
