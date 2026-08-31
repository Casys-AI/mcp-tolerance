import { dirname, fromFileUrl, join } from "@std/path";
import { withAuditedViewerDenoConfig } from "./local-modules.ts";

const here = dirname(fromFileUrl(import.meta.url));
const lock = join(here, "deno.lock");

await withAuditedViewerDenoConfig(async (configPath) => {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "cache",
      "--config",
      configPath,
      `--lock=${lock}`,
      join(here, "src", "limits-main.ts"),
      join(here, "src", "fit-main.ts"),
      join(here, "src", "stackup-main.ts"),
      join(here, "src", "format_test.ts"),
      join(here, "src", "catalog_test.ts"),
      join(here, "src", "components_test.ts"),
    ],
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  if (!result.success) Deno.exit(result.code ?? 1);
});
console.log(`wrote ${lock}`);
