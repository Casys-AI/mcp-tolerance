import { assertEquals } from "@std/assert";
import { FIT_APP_INFO, FIT_COMPONENTS, FIT_DEFAULT_SURFACE } from "./fit-catalog.ts";
import {
  LIMITS_APP_INFO,
  LIMITS_COMPONENTS,
  LIMITS_DEFAULT_SURFACE,
} from "./limits-catalog.ts";
import {
  STACKUP_APP_INFO,
  STACKUP_COMPONENTS,
  STACKUP_DEFAULT_SURFACE,
} from "./stackup-catalog.ts";

Deno.test("each default surface is exactly one result component", () => {
  assertEquals(LIMITS_DEFAULT_SURFACE.components, [{
    id: "result",
    component: LIMITS_COMPONENTS.result,
  }]);
  assertEquals(FIT_DEFAULT_SURFACE.components, [{
    id: "result",
    component: FIT_COMPONENTS.result,
  }]);
  assertEquals(STACKUP_DEFAULT_SURFACE.components, [{
    id: "result",
    component: STACKUP_COMPONENTS.result,
  }]);
  assertEquals(LIMITS_DEFAULT_SURFACE.layout, { type: "stack", gap: "sm" });
  assertEquals(FIT_DEFAULT_SURFACE.layout, { type: "stack", gap: "sm" });
  assertEquals(STACKUP_DEFAULT_SURFACE.layout, { type: "stack", gap: "sm" });
});

Deno.test("catalogs keep detail components off the default whole view", () => {
  assertEquals(
    Object.values(LIMITS_COMPONENTS).includes(LIMITS_COMPONENTS.notChecked),
    true,
  );
  assertEquals(
    LIMITS_DEFAULT_SURFACE.components[0].component,
    LIMITS_COMPONENTS.result,
  );
  assertEquals(
    FIT_DEFAULT_SURFACE.components.map((item) => item.component),
    [FIT_COMPONENTS.result],
  );
  assertEquals(
    STACKUP_DEFAULT_SURFACE.components.map((item) => item.component),
    [STACKUP_COMPONENTS.result],
  );
});

Deno.test("each App identity is resource-scoped, not a global dashboard", () => {
  assertEquals(LIMITS_APP_INFO.name, "mcp-tolerance.limits");
  assertEquals(FIT_APP_INFO.name, "mcp-tolerance.fit");
  assertEquals(STACKUP_APP_INFO.name, "mcp-tolerance.stackup");
  assertEquals(
    new Set([
      LIMITS_APP_INFO.name,
      FIT_APP_INFO.name,
      STACKUP_APP_INFO.name,
    ]).size,
    3,
  );
});
