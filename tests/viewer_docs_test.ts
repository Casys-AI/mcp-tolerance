import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toleranceFitAnalyzeTool } from "../src/tools/fit_analyze.ts";
import {
  TOLERANCE_RECORDED_SESSION_SCHEMAS,
  TOLERANCE_RESULT_SCHEMAS,
  TOLERANCE_UI_RESOURCE_URIS,
} from "../src/ui/app-manifest.ts";
import { isFitViewerData } from "../src/ui/viewers/src/model.ts";
import { parseToleranceRecordedViewSession } from "../src/ui/viewers/src/recorded-session.ts";

Deno.test("README fit fixture is the live H7/g6 @ 25 mm tool result", async () => {
  const source = await Deno.readTextFile(
    new URL("../docs/fixtures/h7-g6-25mm-fit-session.json", import.meta.url),
  );
  const session = JSON.parse(source) as Record<string, unknown>;
  const live = (toleranceFitAnalyzeTool.handler({
    hole_class: "H7",
    shaft_class: "g6",
    nominal_diameter_mm: 25,
  }) as { structuredContent: Record<string, unknown> }).structuredContent;

  assertEquals(session.schemaVersion, TOLERANCE_RECORDED_SESSION_SCHEMAS.fit);
  assertEquals(session.resourceUri, TOLERANCE_UI_RESOURCE_URIS.fit);
  assertEquals(session.resultSchema, TOLERANCE_RESULT_SCHEMAS.fit[1]);
  assertEquals(session.readOnly, true);
  assertEquals(session.structuredContent, live);
  assertEquals(live.fit_type, "clearance");
  assertEquals(live.clearance_min_um, 7);
  assertEquals(live.clearance_max_um, 41);

  const parsed = await parseToleranceRecordedViewSession(
    "fit",
    session,
    isFitViewerData,
  );
  assert(parsed);
  assertEquals(parsed.basis.projectId, "tolerance-fit-viewer-fixture");
  assertEquals(parsed.basis.thread.id, "documentation-fixture-not-evidence");

  const preview = await Deno.readTextFile(
    new URL("../docs/fixtures/viewer-preview.html", import.meta.url),
  );
  assertStringIncludes(preview, "h7-g6-25mm-fit-session.json");
  assertStringIncludes(preview, "not engineering execution evidence");
  assertStringIncludes(preview, 'locale: "en"');

  const readme = await Deno.readTextFile(new URL("../README.md", import.meta.url));
  assertStringIncludes(readme, "docs/assets/tolerance-fit-viewer-fixture.png");
});
