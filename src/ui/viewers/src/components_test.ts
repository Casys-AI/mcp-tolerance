import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  advertisedComponentCatalog,
  mountComponentSurface,
} from "@casys/mcp-view-components";
import type { PreactSurfaceContext } from "@casys/mcp-view-components/preact";
import { FIT_COMPONENTS, FIT_DEFAULT_SURFACE } from "./fit-catalog.ts";
import { LIMITS_COMPONENTS, LIMITS_DEFAULT_SURFACE } from "./limits-catalog.ts";
import { STACKUP_COMPONENTS, STACKUP_DEFAULT_SURFACE } from "./stackup-catalog.ts";
import { FIT_COMPONENT_REGISTRY } from "./fit-components.tsx";
import { LIMITS_COMPONENT_REGISTRY } from "./limits-components.tsx";
import { STACKUP_COMPONENT_REGISTRY } from "./stackup-components.tsx";
import {
  FIT_ANALYZE_H7_G6,
  FIT_H7_P6,
  IT7,
  LIMITS_H7,
  STACKUP_TWO,
} from "./fixtures_test.ts";
import {
  type FitViewerData,
  type LimitsViewerData,
  parseFitAnalyzeResult,
  parseFitResult,
  parseItResult,
  parseLimitsResult,
  parseStackupResult,
  type StackupResult,
} from "./model.ts";

const limitsContext = {} as unknown as PreactSurfaceContext<LimitsViewerData>;
const fitContext = {} as unknown as PreactSurfaceContext<FitViewerData>;
const stackupContext = {} as unknown as PreactSurfaceContext<StackupResult>;

Deno.test("each registry advertises a small catalog and one-card default surface", () => {
  const limits = advertisedComponentCatalog(LIMITS_COMPONENT_REGISTRY);
  assertEquals(Object.keys(limits.components).toSorted(), [
    LIMITS_COMPONENTS.notChecked,
    LIMITS_COMPONENTS.result,
  ]);
  assertEquals(limits.defaultSurface?.components, [
    ...LIMITS_DEFAULT_SURFACE.components,
  ]);

  const fit = advertisedComponentCatalog(FIT_COMPONENT_REGISTRY);
  assertEquals(Object.keys(fit.components).toSorted(), [
    FIT_COMPONENTS.members,
    FIT_COMPONENTS.notChecked,
    FIT_COMPONENTS.result,
  ]);
  assertEquals(fit.defaultSurface?.components, [
    ...FIT_DEFAULT_SURFACE.components,
  ]);

  const stackup = advertisedComponentCatalog(STACKUP_COMPONENT_REGISTRY);
  assertEquals(Object.keys(stackup.components).toSorted(), [
    STACKUP_COMPONENTS.contributors,
    STACKUP_COMPONENTS.notChecked,
    STACKUP_COMPONENTS.result,
  ]);
  assertEquals(
    stackup.defaultSurface?.components,
    [...STACKUP_DEFAULT_SURFACE.components],
  );
});

Deno.test("compact source does not import LimitGauge, SemanticElement, or verdicts", async () => {
  const files = [
    "./result-card.tsx",
    "./limits-components.tsx",
    "./fit-components.tsx",
    "./stackup-components.tsx",
  ];
  for (const relative of files) {
    const source = await Deno.readTextFile(new URL(relative, import.meta.url));
    assertEquals(source.includes("LimitGauge"), false, relative);
    assertEquals(source.includes("ElementVerdict"), false, relative);
    assertEquals(source.includes("SemanticElement"), false, relative);
  }
});

Deno.test({
  name: "limits default surface is one Card for H7 and one Card for IT7",
  permissions: { read: true, env: true },
  async fn() {
    const hole = parseLimitsResult(LIMITS_H7);
    await withMountedSurface(
      LIMITS_COMPONENT_REGISTRY,
      hole,
      limitsContext,
      (root) => {
        assertEquals(root.querySelectorAll("[data-component]").length, 1);
        assertEquals(
          root.querySelector("[data-component]")?.getAttribute(
            "data-component",
          ),
          LIMITS_COMPONENTS.result,
        );
        assertEquals(root.querySelector(".mcp-view-semantic-element"), null);
        assertEquals(root.querySelector(".mcp-view-limit-gauge"), null);
        assertEquals(root.querySelector("[data-element-slot=verdict]"), null);
        assertEquals(root.querySelectorAll('[data-tone="success"]').length, 0);
        assertStringIncludes(root.textContent ?? "", "H7");
        assertStringIncludes(root.textContent ?? "", "ISO 286-1 hole");
        assertStringIncludes(root.textContent ?? "", "µm");
        assertStringIncludes(root.textContent ?? "", "+21");
        assertNoInventedVerdict(root);
      },
    );

    const it = parseItResult(IT7);
    await withMountedSurface(
      LIMITS_COMPONENT_REGISTRY,
      it,
      limitsContext,
      (root) => {
        assertEquals(root.querySelectorAll("[data-component]").length, 1);
        assertStringIncludes(root.textContent ?? "", "IT7");
        assertStringIncludes(root.textContent ?? "", "21");
        assertEquals((root.textContent ?? "").includes("H7"), false);
      },
    );
  },
});

Deno.test({
  name: "fit default surface shows classification without a pass/fail verdict",
  permissions: { read: true, env: true },
  async fn() {
    const fit = parseFitResult(FIT_H7_P6);
    await withMountedSurface(
      FIT_COMPONENT_REGISTRY,
      fit,
      fitContext,
      (root) => {
        assertEquals(root.querySelectorAll("[data-component]").length, 1);
        assertEquals(
          root.querySelector("[data-component]")?.getAttribute(
            "data-component",
          ),
          FIT_COMPONENTS.result,
        );
        assertStringIncludes(root.textContent ?? "", "H7/p6");
        assertStringIncludes(root.textContent ?? "", "interference");
        assertEquals(root.querySelector(".mcp-view-semantic-element"), null);
        assertEquals(root.querySelectorAll('[data-tone="success"]').length, 0);
        assertEquals(root.querySelectorAll('[data-tone="danger"]').length, 0);
        assertNoInventedVerdict(root);
      },
    );

    const analyze = parseFitAnalyzeResult(FIT_ANALYZE_H7_G6);
    await withMountedSurface(
      FIT_COMPONENT_REGISTRY,
      analyze,
      fitContext,
      (root) => {
        assertStringIncludes(root.textContent ?? "", "H7/g6");
        assertStringIncludes(root.textContent ?? "", "clearance");
        assertEquals(
          (root.textContent ?? "").includes("Minimum interference"),
          false,
        );
      },
    );
  },
});

Deno.test({
  name: "stackup default surface omits the contributor table",
  permissions: { read: true, env: true },
  async fn() {
    const stackup = parseStackupResult(STACKUP_TWO);
    await withMountedSurface(
      STACKUP_COMPONENT_REGISTRY,
      stackup,
      stackupContext,
      (root) => {
        assertEquals(root.querySelectorAll("[data-component]").length, 1);
        assertEquals(root.querySelector(".mcp-view-table"), null);
        assertStringIncludes(root.textContent ?? "", "1D stack-up");
        assertStringIncludes(root.textContent ?? "", "2 contributors");
        assertStringIncludes(root.textContent ?? "", "mm");
        assertEquals((root.textContent ?? "").includes("housing depth"), false);
        assertNoInventedVerdict(root);
      },
    );
  },
});

async function withMountedSurface<TData>(
  registry: Parameters<
    typeof mountComponentSurface<TData, unknown>
  >[0]["registry"],
  data: TData,
  appContext: unknown,
  run: (root: HTMLElement) => void | Promise<void>,
): Promise<void> {
  const documentModule = await import("linkedom");
  const dom = documentModule.parseHTML(
    "<html><body><div id=root></div></body></html>",
  );
  const previousDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.document,
  });
  try {
    const root = dom.document.getElementById("root") as unknown as HTMLElement;
    const mounted = await mountComponentSurface({
      root,
      registry,
      data,
      appContext,
      hostContext: {},
    });
    try {
      await run(root);
    } finally {
      await mounted.dispose();
    }
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: previousDocument,
    });
  }
}

function assertNoInventedVerdict(root: HTMLElement): void {
  const text = (root.textContent ?? "").toLowerCase();
  for (const claim of ["pass", "fail", "suitable", "approved", "verified"]) {
    assertEquals(text.includes(claim), false, `must not invent ${claim}`);
  }
}
