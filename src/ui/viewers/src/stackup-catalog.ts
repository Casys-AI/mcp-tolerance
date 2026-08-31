export const STACKUP_COMPONENTS = {
  result: "tolerance.stackup-result",
  contributors: "tolerance.stackup-contributors",
  notChecked: "tolerance.stackup-not-checked",
} as const;

export const STACKUP_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: STACKUP_COMPONENTS.result }],
} as const;

export const STACKUP_APP_INFO = {
  name: "mcp-tolerance.stackup",
  version: "0.3.2",
} as const;
