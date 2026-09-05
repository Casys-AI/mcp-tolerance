/** Provider-owned compatibility declaration for direct and recorded tolerance views. */

import {
  VIEW_APP_MANIFEST_SCHEMA,
  VIEWER_SESSION_APPLY_ACTION,
} from "@casys/mcp-view-contracts";
import { FIT_VIEWER_URI, LIMITS_VIEWER_URI, STACKUP_VIEWER_URI } from "./viewers.ts";

export const TOLERANCE_VIEW_APP_MANIFEST_SCHEMA = VIEW_APP_MANIFEST_SCHEMA;
export const TOLERANCE_VIEWER_SESSION_ACTION = VIEWER_SESSION_APPLY_ACTION;

export const TOLERANCE_UI_RESOURCE_URIS = {
  limits: LIMITS_VIEWER_URI,
  fit: FIT_VIEWER_URI,
  stackup: STACKUP_VIEWER_URI,
} as const;

export const TOLERANCE_RESULT_SCHEMAS = {
  limits: [
    "io.casys.mcp-tolerance.limits-result/1.0",
    "io.casys.mcp-tolerance.it-result/1.0",
  ],
  fit: [
    "io.casys.mcp-tolerance.fit-result/1.0",
    "io.casys.mcp-tolerance.fit-analysis-result/1.0",
  ],
  stackup: ["io.casys.mcp-tolerance.stackup-result/1.0"],
} as const;

export const TOLERANCE_RECORDED_SESSION_SCHEMAS = {
  limits: "io.casys.mcp-tolerance.recorded-limits-session/1.0",
  fit: "io.casys.mcp-tolerance.recorded-fit-session/1.0",
  stackup: "io.casys.mcp-tolerance.recorded-stackup-session/1.0",
} as const;

export type ToleranceViewKey = keyof typeof TOLERANCE_UI_RESOURCE_URIS;

export interface ToleranceViewAppResource {
  readonly uri: (typeof TOLERANCE_UI_RESOURCE_URIS)[ToleranceViewKey];
  readonly ownership: "whole-view";
  readonly resultSchemas: readonly string[];
  readonly acceptedActions: readonly [typeof TOLERANCE_VIEWER_SESSION_ACTION];
  readonly sessionSchemas: readonly string[];
}

export interface ToleranceViewAppManifest {
  readonly schemaVersion: typeof TOLERANCE_VIEW_APP_MANIFEST_SCHEMA;
  readonly app: Readonly<{
    id: "io.casys.mcp-tolerance";
    title: "Tolerance Views";
    version: "0.3.5";
  }>;
  readonly resources: readonly Readonly<ToleranceViewAppResource>[];
}

const resources: readonly ToleranceViewAppResource[] = [
  {
    uri: TOLERANCE_UI_RESOURCE_URIS.limits,
    ownership: "whole-view",
    resultSchemas: TOLERANCE_RESULT_SCHEMAS.limits,
    acceptedActions: [TOLERANCE_VIEWER_SESSION_ACTION],
    sessionSchemas: [TOLERANCE_RECORDED_SESSION_SCHEMAS.limits],
  },
  {
    uri: TOLERANCE_UI_RESOURCE_URIS.fit,
    ownership: "whole-view",
    resultSchemas: TOLERANCE_RESULT_SCHEMAS.fit,
    acceptedActions: [TOLERANCE_VIEWER_SESSION_ACTION],
    sessionSchemas: [TOLERANCE_RECORDED_SESSION_SCHEMAS.fit],
  },
  {
    uri: TOLERANCE_UI_RESOURCE_URIS.stackup,
    ownership: "whole-view",
    resultSchemas: TOLERANCE_RESULT_SCHEMAS.stackup,
    acceptedActions: [TOLERANCE_VIEWER_SESSION_ACTION],
    sessionSchemas: [TOLERANCE_RECORDED_SESSION_SCHEMAS.stackup],
  },
];

/**
 * Presentation compatibility only. The manifest contains no provider endpoint,
 * credentials, tool arguments, Digital Thread anchor, or live execution policy.
 */
export const TOLERANCE_VIEW_APP_MANIFEST: Readonly<ToleranceViewAppManifest> = Object
  .freeze({
    schemaVersion: TOLERANCE_VIEW_APP_MANIFEST_SCHEMA,
    app: Object.freeze({
      id: "io.casys.mcp-tolerance",
      title: "Tolerance Views",
      version: "0.3.5",
    }),
    resources: Object.freeze(
      resources.map((resource) => Object.freeze(resource)),
    ),
  });
