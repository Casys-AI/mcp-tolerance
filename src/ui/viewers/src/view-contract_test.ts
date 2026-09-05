import { assert, assertEquals } from "@std/assert";
import type { SurfaceHostAccess } from "@casys/mcp-view-components/preact";
import {
  TOLERANCE_RECORDED_SESSION_SCHEMAS,
  TOLERANCE_RESULT_SCHEMAS,
  TOLERANCE_UI_RESOURCE_URIS,
  TOLERANCE_VIEW_APP_MANIFEST,
  TOLERANCE_VIEWER_SESSION_ACTION,
} from "../../app-manifest.ts";
import { isFitViewerData, isLimitsViewerData, isStackupViewerData } from "./model.ts";
import {
  fingerprintToleranceRecordedProjection,
  isToleranceRecordedViewSession,
} from "./recorded-session.ts";
import { toleranceSurfaceAppOptions } from "./app.ts";
import { LIMITS_COMPONENT_REGISTRY } from "./limits-components.tsx";
import { LIMITS_H7 } from "./fixtures_test.ts";

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
  assertEquals(
    packageManifest.version,
    TOLERANCE_VIEW_APP_MANIFEST.app.version,
  );
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
  assertEquals(
    isToleranceRecordedViewSession("fit", null, isFitViewerData),
    false,
  );
  assertEquals(
    isToleranceRecordedViewSession("stackup", [], isStackupViewerData),
    false,
  );

  const receiver = toleranceSurfaceAppOptions({
    root: {} as HTMLElement,
    view: "limits",
    registry: LIMITS_COMPONENT_REGISTRY,
    validate: isLimitsViewerData,
    loadingLabel: "Loading",
    emptyLabel: "Empty",
  }).viewerSession;
  assert(receiver);
  const host = {} as SurfaceHostAccess;
  const projection = {
    schemaVersion: TOLERANCE_RECORDED_SESSION_SCHEMAS.limits,
    resourceUri: TOLERANCE_UI_RESOURCE_URIS.limits,
    resultSchema: TOLERANCE_RESULT_SCHEMAS.limits[0],
    readOnly: true as const,
    basis: {
      projectId: "viewer-fixture",
      projectRevision: 1,
      subjectId: "limits-fixture",
      thread: { id: "thread-fixture", revision: 1 },
      artifact: {
        id: "artifact-fixture",
        fingerprint: `sha256:${"a".repeat(64)}`,
      },
    },
    structuredContent: LIMITS_H7,
  };
  const session = {
    ...projection,
    projectionFingerprint: await fingerprintToleranceRecordedProjection(
      projection,
    ),
  };
  assert(receiver.validate(session));
  assertEquals(await receiver.toState(session, host), {
    kind: "result",
    result: LIMITS_H7,
  });
  for (
    const invalid of [{}, {
      ...session,
      projectionFingerprint: `sha256:${"0".repeat(64)}`,
    }]
  ) {
    assert(receiver.validate(invalid));
    assertEquals((await receiver.toState(invalid, host)).kind, "error");
  }
});
