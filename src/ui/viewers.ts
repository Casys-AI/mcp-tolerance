/** MCP App resource identities for the three bounded tolerance viewers. */

export const LIMITS_VIEWER_NAME = "limits-viewer";
export const FIT_VIEWER_NAME = "fit-viewer";
export const STACKUP_VIEWER_NAME = "stackup-viewer";

export const LIMITS_VIEWER_URI = "ui://mcp-tolerance/limits-viewer";
export const FIT_VIEWER_URI = "ui://mcp-tolerance/fit-viewer";
export const STACKUP_VIEWER_URI = "ui://mcp-tolerance/stackup-viewer";

export const TOLERANCE_VIEWER_NAMES = [
  LIMITS_VIEWER_NAME,
  FIT_VIEWER_NAME,
  STACKUP_VIEWER_NAME,
] as const;

export const TOOL_VIEWER_URIS = {
  tolerance_limits: LIMITS_VIEWER_URI,
  tolerance_it: LIMITS_VIEWER_URI,
  tolerance_fit: FIT_VIEWER_URI,
  tolerance_fit_analyze: FIT_VIEWER_URI,
  tolerance_stackup: STACKUP_VIEWER_URI,
} as const;
