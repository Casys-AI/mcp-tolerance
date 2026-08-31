export const FIT_COMPONENTS = {
  result: "tolerance.fit-result",
  members: "tolerance.fit-members",
  notChecked: "tolerance.fit-not-checked",
} as const;

export const FIT_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: FIT_COMPONENTS.result }],
} as const;

export const FIT_APP_INFO = {
  name: "mcp-tolerance.fit",
  version: "0.3.2",
} as const;
