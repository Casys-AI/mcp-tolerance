import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  advertisedComponentCatalog,
  mountComponentSurface,
} from "@casys/mcp-view-components";
import {
  FIT_COMPONENT,
  FIT_COMPONENT_REGISTRY,
  FIT_DEFAULT_SURFACE,
} from "./fit-components.tsx";
import {
  LIMITS_COMPONENT,
  LIMITS_COMPONENT_REGISTRY,
  LIMITS_DEFAULT_SURFACE,
} from "./limits-components.tsx";
import {
  STACKUP_COMPONENT,
  STACKUP_COMPONENT_REGISTRY,
  STACKUP_DEFAULT_SURFACE,
} from "./stackup-components.tsx";
import {
  FIT_ANALYZE_H7_G6,
  FIT_H7_P6,
  IT7,
  LIMITS_H7,
  STACKUP_TWO,
} from "./fixtures_test.ts";
import {
  parseFitAnalyzeResult,
  parseFitResult,
  parseItResult,
  parseLimitsResult,
  parseStackupResult,
} from "./model.ts";

Deno.test("each viewer advertises exactly one business-object component", () => {
  const cases = [
    [
      advertisedComponentCatalog(LIMITS_COMPONENT_REGISTRY),
      LIMITS_COMPONENT,
      LIMITS_DEFAULT_SURFACE,
    ],
    [
      advertisedComponentCatalog(FIT_COMPONENT_REGISTRY),
      FIT_COMPONENT,
      FIT_DEFAULT_SURFACE,
    ],
    [
      advertisedComponentCatalog(STACKUP_COMPONENT_REGISTRY),
      STACKUP_COMPONENT,
      STACKUP_DEFAULT_SURFACE,
    ],
  ] as const;
  for (const [advertised, component, surface] of cases) {
    assertEquals(Object.keys(advertised.components), [component]);
    assertEquals(advertised.defaultSurface?.components, [
      ...surface.components,
    ]);
  }
});

Deno.test("provider components use semantic slots without path or verdict UI", async () => {
  for (
    const relative of [
      "./limits-components.tsx",
      "./fit-components.tsx",
      "./stackup-components.tsx",
    ]
  ) {
    const source = await Deno.readTextFile(new URL(relative, import.meta.url));
    assertEquals(source.includes("SemanticElement"), true, relative);
    assertEquals(source.includes("ElementIdent"), true, relative);
    assertEquals(source.includes("ElementReading"), true, relative);
    assertEquals(source.includes("ElementProvenance"), true, relative);
    assertEquals(source.includes("ElementVerdict"), false, relative);
    assertEquals(source.includes("PathBar"), false, relative);
    assertEquals(source.includes("<Card"), false, relative);
    assertEquals(source.includes("FocusedView"), false, relative);
    assertEquals(source.includes("Disclosure"), false, relative);
  }
  const notes = await Deno.readTextFile(
    new URL("./scope-notes.tsx", import.meta.url),
  );
  assertEquals(notes.includes("ElementSection"), true);
  assertEquals(notes.includes("Message"), true);
});

Deno.test({
  name: "limits viewer keeps one object, required readings, scope, and provenance",
  permissions: { read: true, env: true },
  async fn() {
    for (const data of [parseLimitsResult(LIMITS_H7), parseItResult(IT7)]) {
      await withMountedSurface(
        LIMITS_COMPONENT_REGISTRY,
        data,
        (root) => {
          assertEquals(root.querySelectorAll("[data-component]").length, 1);
          assertEquals(
            root.querySelectorAll(".mcp-view-semantic-element").length,
            1,
          );
          assertEquals(root.querySelector("[data-element-slot=verdict]"), null);
          assertEquals(
            root.querySelector("[data-element-slot=ident]") !== null,
            true,
          );
          assertEquals(
            root.querySelectorAll("[data-element-slot=reading]").length > 1,
            true,
          );
          assertStringIncludes(root.textContent ?? "", "ISO 286-1");
          assertStringIncludes(root.textContent ?? "", "Not checked");
          assertStringIncludes(root.textContent ?? "", "formulas/tables");
          assertNoInventedVerdict(root);
        },
      );
    }
  },
});

Deno.test({
  name: "fit viewer keeps classification and member readings inside one object",
  permissions: { read: true, env: true },
  async fn() {
    for (
      const data of [
        parseFitResult(FIT_H7_P6),
        parseFitAnalyzeResult(FIT_ANALYZE_H7_G6),
      ]
    ) {
      await withMountedSurface(
        FIT_COMPONENT_REGISTRY,
        data,
        (root) => {
          assertEquals(root.querySelectorAll("[data-component]").length, 1);
          assertEquals(
            root.querySelectorAll(".mcp-view-semantic-element").length,
            1,
          );
          assertStringIncludes(
            root.textContent ?? "",
            `${data.hole.designation}/${data.shaft.designation}`,
          );
          assertStringIncludes(root.textContent ?? "", "Fit type");
          assertStringIncludes(
            root.textContent ?? "",
            `Hole ${data.hole.designation}`,
          );
          assertStringIncludes(
            root.textContent ?? "",
            `Shaft ${data.shaft.designation}`,
          );
          assertEquals(root.querySelector("[data-element-slot=verdict]"), null);
          assertNoInventedVerdict(root);
        },
      );
    }
  },
});

Deno.test({
  name: "stack-up viewer keeps aggregate and contributor detail in one object",
  permissions: { read: true, env: true },
  async fn() {
    await withMountedSurface(
      STACKUP_COMPONENT_REGISTRY,
      parseStackupResult(STACKUP_TWO),
      (root) => {
        assertEquals(root.querySelectorAll("[data-component]").length, 1);
        assertEquals(
          root.querySelectorAll(".mcp-view-semantic-element").length,
          1,
        );
        assertEquals(root.querySelectorAll(".mcp-view-table").length, 1);
        assertEquals(root.querySelector("details"), null);
        assertStringIncludes(root.textContent ?? "", "housing depth");
        assertStringIncludes(root.textContent ?? "", "shaft length");
        assertStringIncludes(root.textContent ?? "", "Worst-case min");
        assertStringIncludes(root.textContent ?? "", "deterministic");
        assertEquals(root.querySelector("[data-element-slot=verdict]"), null);
        assertNoInventedVerdict(root);
      },
    );
  },
});

Deno.test({
  name: "host locale translates labels and leaves recorded domain strings intact",
  permissions: { read: true, env: true },
  async fn() {
    await withMountedSurface(
      FIT_COMPONENT_REGISTRY,
      parseFitAnalyzeResult(FIT_ANALYZE_H7_G6),
      (root) => {
        assertStringIncludes(root.textContent ?? "", "Type d’ajustement");
        assertStringIncludes(root.textContent ?? "", "Jeu minimum");
        assertStringIncludes(root.textContent ?? "", "Alésage H7");
        assertStringIncludes(root.textContent ?? "", "Arbre g6");
        assertStringIncludes(root.textContent ?? "", "clearance");
        assertStringIncludes(
          root.textContent ?? "",
          "ISO 286-1:2010 formulas/tables",
        );
        assertEquals((root.textContent ?? "").includes("Fit type"), false);
        assertEquals((root.textContent ?? "").includes("Hole H7"), false);
      },
      "fr",
    );
    await withMountedSurface(
      LIMITS_COMPONENT_REGISTRY,
      parseLimitsResult(LIMITS_H7),
      (root) => {
        assertStringIncludes(root.textContent ?? "", "Alésage ISO 286-1");
        assertStringIncludes(root.textContent ?? "", "Écart inférieur");
        assertStringIncludes(root.textContent ?? "", "hole");
        assertStringIncludes(root.textContent ?? "", "H7");
        assertEquals((root.textContent ?? "").includes("Not checked"), false);
        assertStringIncludes(root.textContent ?? "", "Non vérifié");
        assertStringIncludes(
          root.textContent ?? "",
          "Surface roughness and form tolerances are not included",
        );
      },
      "fr",
    );
    await withMountedSurface(
      STACKUP_COMPONENT_REGISTRY,
      parseStackupResult(STACKUP_TWO),
      (root) => {
        assertStringIncludes(root.textContent ?? "", "Empilage 1D");
        assertStringIncludes(root.textContent ?? "", "Min. au pire cas");
        assertStringIncludes(root.textContent ?? "", "housing depth");
        assertEquals(root.querySelector("details"), null);
        assertEquals(root.querySelectorAll(".mcp-view-table").length, 1);
      },
      "fr",
    );
    await withMountedSurface(
      FIT_COMPONENT_REGISTRY,
      parseFitResult(FIT_H7_P6),
      (root) => {
        assertStringIncludes(root.textContent ?? "", "Fit type");
        assertStringIncludes(root.textContent ?? "", "interference");
      },
      "not a locale",
    );
  },
});

async function withMountedSurface<TData>(
  registry: Parameters<
    typeof mountComponentSurface<TData, unknown>
  >[0]["registry"],
  data: TData,
  run: (root: HTMLElement) => void | Promise<void>,
  locale?: string,
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
    const hostContext = locale === undefined ? {} : { locale };
    const mounted = await mountComponentSurface({
      root,
      registry,
      data,
      appContext: { hostContext },
      hostContext,
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
