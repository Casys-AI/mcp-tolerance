import { assertEquals, assertThrows } from "@std/assert";
import { allTools } from "../../../tools/mod.ts";
import {
  CONTRIBUTOR_CAP,
  NOT_CHECKED_CAP,
  UNIT_MM,
  UNIT_MM2,
  UNIT_UM,
} from "./format.ts";
import {
  isFitViewerData,
  isLimitsViewerData,
  isStackupViewerData,
  type LimitsResult,
  parseFitAnalyzeResult,
  parseFitResult,
  parseItResult,
  parseLimitsResult,
  parseStackupResult,
  presentFit,
  presentFitAnalyze,
  presentIt,
  presentLimits,
  presentNotChecked,
  presentStackup,
  presentStackupContributors,
} from "./model.ts";

function tool(name: string) {
  const found = allTools.find((item) => item.name === name);
  if (!found) throw new Error(`missing tool ${name}`);
  return found;
}

function structured(
  name: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const result = tool(name).handler(args) as {
    structuredContent: Record<string, unknown>;
  };
  return result.structuredContent;
}

Deno.test("limits parser accepts the closed H7@25 mm result and rejects extra fields", () => {
  const raw = structured("tolerance_limits", {
    tolerance_class: "H7",
    nominal_diameter_mm: 25,
  });
  const parsed = parseLimitsResult(raw);
  assertEquals(parsed.designation, "H7");
  assertEquals(parsed.designation_type, "hole");
  assertEquals(parsed.lower_um, 0);
  assertEquals(parsed.upper_um, 21);
  assertEquals(parsed.IT_um, 21);
  assertEquals(parsed.violations, []);
  assertEquals(isLimitsViewerData(parsed), true);
  assertThrows(
    () => parseLimitsResult({ ...raw, extra: true }),
    TypeError,
    "unsupported fields",
  );
});

Deno.test("IT parser accepts IT7@25 mm and is distinct from a limits result", () => {
  const raw = structured("tolerance_it", { grade: 7, nominal_diameter_mm: 25 });
  const parsed = parseItResult(raw);
  assertEquals(parsed.grade, 7);
  assertEquals(parsed.IT_um, 21);
  assertEquals(parsed.diameter_range_mm, [18, 30]);
  assertEquals(isLimitsViewerData(parsed), true);
  assertThrows(() => parseLimitsResult(raw), TypeError);
  assertThrows(() =>
    parseItResult(structured("tolerance_limits", {
      tolerance_class: "H7",
      nominal_diameter_mm: 25,
    })), TypeError);
});

Deno.test("fit parsers keep hole-basis and analyze shapes separate", () => {
  const fitRaw = structured("tolerance_fit", {
    hole_code: "H7",
    shaft_code: "g6",
    nominal_diameter_mm: 25,
  });
  const analyzeRaw = structured("tolerance_fit_analyze", {
    hole_class: "G7",
    shaft_class: "h6",
    nominal_diameter_mm: 25,
  });
  const fit = parseFitResult(fitRaw);
  const analyze = parseFitAnalyzeResult(analyzeRaw);
  assertEquals(fit.fit.type, "clearance");
  assertEquals(fit.fit.min_clearance_um, 7);
  assertEquals(analyze.fit_type, "clearance");
  assertEquals(analyze.clearance_min_um, 7);
  assertEquals(isFitViewerData(fit), true);
  assertEquals(isFitViewerData(analyze), true);
  assertThrows(() => parseFitResult(analyzeRaw), TypeError);
  assertThrows(() => parseFitAnalyzeResult(fitRaw), TypeError);
});

Deno.test("stackup parser preserves contributor order and reconstructable aggregates", () => {
  const raw = structured("tolerance_stackup", {
    contributors: [
      {
        name: "housing depth",
        nominal_mm: 50,
        plus_um: 100,
        minus_um: 40,
        direction: 1,
      },
      {
        name: "shaft length",
        nominal_mm: 40,
        plus_um: 80,
        minus_um: 25,
        direction: -1,
      },
    ],
  });
  const parsed = parseStackupResult(raw);
  assertEquals(parsed.contributor_count, 2);
  assertEquals(parsed.contributor_breakdown.map((item) => item.name), [
    "housing depth",
    "shaft length",
  ]);
  assertEquals(isStackupViewerData(parsed), true);
  assertEquals(isLimitsViewerData(parsed), false);
});

Deno.test("limits presentation uses payload units and signed deviations", () => {
  const card = presentLimits(parseLimitsResult(structured("tolerance_limits", {
    tolerance_class: "g6",
    nominal_diameter_mm: 25,
  })));
  assertEquals(card.title, "g6");
  assertEquals(card.eyebrow, "ISO 286-1 shaft");
  assertEquals(card.badge, { label: "shaft", tone: "neutral" });
  assertEquals(card.metrics, [
    { id: "nominal", label: "Nominal", value: "25", unit: UNIT_MM },
    { id: "lower", label: "Lower deviation", value: "-20", unit: UNIT_UM },
    { id: "upper", label: "Upper deviation", value: "-7", unit: UNIT_UM },
    { id: "it", label: "IT", value: "13", unit: UNIT_UM },
  ]);
  assertEquals(
    card.facts.find((item) => item.id === "range")?.value,
    "18–30 mm",
  );
  assertEquals(card.provenance, "ISO 286-1:2010 formulas/tables");
});

Deno.test("IT presentation reports the tabulated IT width only", () => {
  const card = presentIt(parseItResult(structured("tolerance_it", {
    grade: 7,
    nominal_diameter_mm: 25,
  })));
  assertEquals(card.title, "IT7");
  assertEquals(card.eyebrow, "ISO 286-1 fundamental tolerance");
  assertEquals(card.metrics, [
    { id: "nominal", label: "Nominal", value: "25", unit: UNIT_MM },
    { id: "it", label: "IT", value: "21", unit: UNIT_UM },
  ]);
});

Deno.test("fit presentation treats fit type as a classification, not a verdict", () => {
  const clearance = presentFit(parseFitResult(structured("tolerance_fit", {
    hole_code: "H7",
    shaft_code: "g6",
    nominal_diameter_mm: 25,
  })));
  assertEquals(clearance.title, "H7/g6");
  assertEquals(clearance.badge, { label: "clearance", tone: "neutral" });
  assertEquals(clearance.metrics.map((item) => item.id), [
    "nominal",
    "min-clearance",
    "max-clearance",
    "min-interference",
    "max-interference",
  ]);
  assertEquals(clearance.metrics[1], {
    id: "min-clearance",
    label: "Minimum clearance",
    value: "7",
    unit: UNIT_UM,
  });

  const interference = presentFit(parseFitResult(structured("tolerance_fit", {
    hole_code: "H7",
    shaft_code: "p6",
    nominal_diameter_mm: 25,
  })));
  assertEquals(interference.badge, { label: "interference", tone: "neutral" });

  const analyze = presentFitAnalyze(
    parseFitAnalyzeResult(structured("tolerance_fit_analyze", {
      hole_class: "H7",
      shaft_class: "k6",
      nominal_diameter_mm: 25,
    })),
  );
  assertEquals(analyze.badge, { label: "transition", tone: "neutral" });
  assertEquals(analyze.metrics.map((item) => item.unit), [
    UNIT_MM,
    UNIT_UM,
    UNIT_UM,
  ]);
});

Deno.test("stackup presentation and contributor cap stay bounded", () => {
  const parsed = parseStackupResult(structured("tolerance_stackup", {
    contributors: [
      { name: "A", nominal_mm: 10, plus_um: 50, minus_um: 50, direction: 1 },
      { name: "B", nominal_mm: 5, plus_um: 50, minus_um: 50, direction: 1 },
    ],
  }));
  const card = presentStackup(parsed);
  assertEquals(card.title, "1D stack-up");
  assertEquals(card.eyebrow, "2 contributors");
  assertEquals(card.metrics[0], {
    id: "nominal",
    label: "Nominal",
    value: "15",
    unit: UNIT_MM,
  });
  assertEquals(card.metrics.some((item) => item.unit === UNIT_MM2), false);

  const many = parseStackupResult(structured("tolerance_stackup", {
    contributors: Array.from({ length: CONTRIBUTOR_CAP + 3 }, (_, index) => ({
      name: `C${index + 1}`,
      nominal_mm: 1,
      plus_um: 10,
      minus_um: 10,
      direction: 1,
    })),
  }));
  const table = presentStackupContributors(many);
  assertEquals(table.rows.length, CONTRIBUTOR_CAP);
  assertEquals(table.omitted, 3);
  assertEquals(table.omittedLabel, "3 more contributors omitted");
  assertEquals(table.rows[0].rss_upper_sq_mm2.endsWith(` ${UNIT_MM2}`), false);
  assertEquals(table.columns.includes("rss_upper_sq_mm2"), true);
});

Deno.test("not_checked presentation caps rows and reports the omitted count", () => {
  const limits = parseLimitsResult(structured("tolerance_limits", {
    tolerance_class: "H7",
    nominal_diameter_mm: 25,
  })) as LimitsResult;
  const listed = presentNotChecked([
    ...limits.not_checked,
    "extra note one",
    "extra note two",
  ]);
  assertEquals(listed.items.length, NOT_CHECKED_CAP);
  assertEquals(listed.omitted, limits.not_checked.length + 2 - NOT_CHECKED_CAP);
  assertEquals(
    listed.omittedLabel?.includes("not-checked"),
    true,
  );
});
