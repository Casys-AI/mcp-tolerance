export const LIMITS_COMPONENTS = {
  result: "tolerance.limits-result",
  notChecked: "tolerance.limits-not-checked",
} as const;

export const LIMITS_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: LIMITS_COMPONENTS.result }],
} as const;

export const LIMITS_APP_INFO = {
  name: "mcp-tolerance.limits",
  version: "0.3.2",
} as const;
