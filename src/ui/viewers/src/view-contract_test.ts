import { assertEquals } from "@std/assert";
import {
  TOLERANCE_VIEW_APP_MANIFEST,
  TOLERANCE_VIEWER_SESSION_ACTION,
} from "../../app-manifest.ts";
import { isFitViewerData, isLimitsViewerData, isStackupViewerData } from "./model.ts";
import { isToleranceRecordedViewSession } from "./recorded-session.ts";

Deno.test("serialized View App manifest is the exact provider-owned contract", async () => {
  const serialized = JSON.parse(
    await Deno.readTextFile(
      new URL("../../view-app-manifest.json", import.meta.url),
    ),
  );
  assertEquals(serialized, TOLERANCE_VIEW_APP_MANIFEST);

  const packageManifest = JSON.parse(
    await Deno.readTextFile(new URL("../../../../deno.json", import.meta.url)),
  );
  assertEquals(packageManifest.version, TOLERANCE_VIEW_APP_MANIFEST.app.version);
  assertEquals(
    packageManifest.exports["./view-app-manifest"],
    "./src/ui/view-app-manifest.json",
  );
});

Deno.test("each whole-view resource declares one recorded session receiver contract", () => {
  assertEquals(TOLERANCE_VIEW_APP_MANIFEST.resources.length, 3);
  for (const resource of TOLERANCE_VIEW_APP_MANIFEST.resources) {
    assertEquals(resource.ownership, "whole-view");
    assertEquals(resource.acceptedActions, [TOLERANCE_VIEWER_SESSION_ACTION]);
    assertEquals(resource.sessionSchemas.length, 1);
    assertEquals("components" in resource, false);
  }
  assertEquals("endpoint" in TOLERANCE_VIEW_APP_MANIFEST, false);
  assertEquals("tools" in TOLERANCE_VIEW_APP_MANIFEST, false);
  assertEquals("anchors" in TOLERANCE_VIEW_APP_MANIFEST, false);
});

Deno.test("App-level receiver rejects non-session input for every result family", async () => {
  assertEquals(
    isToleranceRecordedViewSession("limits", {}, isLimitsViewerData),
    false,
  );
  assertEquals(isToleranceRecordedViewSession("fit", null, isFitViewerData), false);
  assertEquals(
    isToleranceRecordedViewSession("stackup", [], isStackupViewerData),
    false,
  );

  const source = await Deno.readTextFile(new URL("./app.ts", import.meta.url));
  assertEquals(source.includes("validateSession:"), true);
  assertEquals(source.includes("mapSessionToData:"), true);
  assertEquals(source.includes("parseToleranceRecordedViewSession"), true);
});
