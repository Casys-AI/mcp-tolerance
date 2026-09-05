/// <reference lib="deno.ns" />

/**
 * Write docs/fixtures/h7-g6-25mm-fit-session.json from the live
 * `tolerance_fit_analyze` handler. The envelope is a documentation fixture,
 * not engineering execution evidence.
 *
 * Usage: deno task docs:viewer-fixture
 */

import { dirname, fromFileUrl, join } from "@std/path";
import { toleranceFitAnalyzeTool } from "../src/tools/fit_analyze.ts";
import {
  TOLERANCE_RECORDED_SESSION_SCHEMAS,
  TOLERANCE_RESULT_SCHEMAS,
  TOLERANCE_UI_RESOURCE_URIS,
} from "../src/ui/app-manifest.ts";
import { isFitViewerData } from "../src/ui/viewers/src/model.ts";
import {
  fingerprintToleranceRecordedProjection,
  parseToleranceRecordedViewSession,
} from "../src/ui/viewers/src/recorded-session.ts";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const target = join(root, "docs/fixtures/h7-g6-25mm-fit-session.json");

const result = toleranceFitAnalyzeTool.handler({
  hole_class: "H7",
  shaft_class: "g6",
  nominal_diameter_mm: 25,
}) as { structuredContent: Record<string, unknown> };
const structuredContent = result.structuredContent;

if (
  structuredContent.fit_type !== "clearance" ||
  structuredContent.clearance_min_um !== 7 ||
  structuredContent.clearance_max_um !== 41 ||
  structuredContent.nominal_diameter_mm !== 25
) {
  throw new Error(
    "H7/g6 @ 25 mm no longer matches the ISO 286-1 reference clearance 7–41 µm",
  );
}
if (!isFitViewerData(structuredContent)) {
  throw new Error("H7/g6 @ 25 mm tool result failed the fit viewer guard");
}

const projection = {
  schemaVersion: TOLERANCE_RECORDED_SESSION_SCHEMAS.fit,
  resourceUri: TOLERANCE_UI_RESOURCE_URIS.fit,
  resultSchema: TOLERANCE_RESULT_SCHEMAS.fit[1],
  readOnly: true as const,
  basis: {
    projectId: "tolerance-fit-viewer-fixture",
    projectRevision: 0,
    subjectId: "H7/g6@25mm-fixture",
    thread: { id: "documentation-fixture-not-evidence", revision: 0 },
    artifact: {
      id: "iso286-h7-g6-25mm-fixture",
      fingerprint: `sha256:${"a".repeat(64)}`,
    },
  },
  structuredContent,
};
const session = {
  ...projection,
  projectionFingerprint: await fingerprintToleranceRecordedProjection(
    projection,
  ),
};
const parsed = await parseToleranceRecordedViewSession(
  "fit",
  session,
  isFitViewerData,
);
if (!parsed) {
  throw new Error("generated H7/g6 fixture failed the recorded-session parser");
}

await Deno.mkdir(dirname(target), { recursive: true });
await Deno.writeTextFile(target, `${JSON.stringify(session, null, 2)}\n`);
console.log(`wrote ${target}`);
