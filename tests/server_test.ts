/**
 * mcp-tolerance server tests.
 *
 * Validates:
 * - ISO 286-1:2010 engine formulas and tables against published normative values.
 * - Extended shaft letters (c, r) and hole letters (C–G, JS, K, M, N, P, R, S).
 * - Table/formula divergence for small diameters (IT6@3–6, shaft g@0–3).
 * - MCP wire contract (stateless, server/discover, tools/list, tools/call).
 * - Output schema contracts (closed schema, required fields).
 * - CLI parsing.
 * - tolerance_limits, tolerance_fit_analyze, tolerance_stackup handlers.
 * - Dimension chain stackup: worst-case and RSS.
 *
 * Guard: TOLERANCE_RUN_NATIVE=1 enables any future integration tests.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import { createToleranceServer, parseCli } from "../server.ts";
import {
  computeFit,
  DIAMETER_RANGES,
  findRangeIndex,
  fundamentalTolerance,
  geometricMean,
  holeDeviations,
  parseDesignation,
  shaftDeviations,
  toleranceFactor,
} from "../src/api/iso286.ts";
import { allTools } from "../src/tools/mod.ts";

const _RUN_NATIVE = Deno.env.get("TOLERANCE_RUN_NATIVE") === "1";

const PROTOCOL_VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": {
    name: "mcp-tolerance-test",
    version: "0.1.0",
  },
};

// ── ISO 286-1 engine unit tests ────────────────────────────────────────────

Deno.test("findRangeIndex places 25 mm in the 18–30 range (index 4)", () => {
  assertEquals(findRangeIndex(25), 4);
});

Deno.test("findRangeIndex places 3 mm in the 0–3 range (index 0)", () => {
  assertEquals(findRangeIndex(3), 0);
});

Deno.test("findRangeIndex places 3.001 mm in the 3–6 range (index 1)", () => {
  assertEquals(findRangeIndex(3.001), 1);
});

Deno.test("findRangeIndex rejects 0 mm (out of range)", () => {
  assertThrows(() => findRangeIndex(0), RangeError);
});

Deno.test("findRangeIndex rejects 500.1 mm (out of range)", () => {
  assertThrows(() => findRangeIndex(500.1), RangeError);
});

Deno.test("geometricMean for range 18–30 (index 4) equals sqrt(18*30)", () => {
  const D = geometricMean(4);
  const expected = Math.sqrt(18 * 30);
  assert(Math.abs(D - expected) < 1e-9, `Expected ${expected}, got ${D}`);
});

Deno.test("geometricMean for range 0–3 (index 0) uses lower bound 1", () => {
  const D = geometricMean(0);
  const expected = Math.sqrt(1 * 3);
  assert(Math.abs(D - expected) < 1e-9, `Expected ${expected}, got ${D}`);
});

Deno.test("toleranceFactor for D=23.238 mm is approximately 1.307 µm", () => {
  const i = toleranceFactor(23.238);
  assert(Math.abs(i - 1.307) < 0.001, `Expected ≈1.307, got ${i}`);
});

// ── IT grade table values (ISO 286-1:2010 Table 1) ────────────────────────

// These values are normative; the test proves we use the table, not only the formula.

Deno.test("IT6 at 2 mm (range 0–3) equals 6 µm per ISO 286-1:2010 Table 1", () => {
  // formula path (16*i with D=sqrt(1*3)=1.732) would give 5, not 6.
  // The table prevails.
  assertEquals(fundamentalTolerance(6, 2), 6);
});

Deno.test("IT6 at 5 mm (range 3–6) equals 8 µm per ISO 286-1:2010 Table 1", () => {
  // formula gives 7 for D=4.243 — table says 8
  assertEquals(fundamentalTolerance(6, 5), 8);
});

Deno.test("IT7 at 25 mm equals 21 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(7, 25), 21);
});

Deno.test("IT6 at 25 mm equals 13 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(6, 25), 13);
});

Deno.test("IT8 at 25 mm equals 33 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(8, 25), 33);
});

Deno.test("IT11 at 25 mm equals 130 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(11, 25), 130);
});

Deno.test("IT12 at 25 mm equals 210 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(12, 25), 210);
});

Deno.test("IT7 at 50 mm equals 25 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(7, 50), 25);
});

Deno.test("IT3 at 25 mm is the tabulated value 4 µm", () => {
  assertEquals(fundamentalTolerance(3, 25), 4);
});

Deno.test("IT5 at 100 mm equals 15 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(5, 100), 15);
});

Deno.test("IT7 at 450 mm equals 63 µm (ISO 286-1:2010 Table 1)", () => {
  assertEquals(fundamentalTolerance(7, 450), 63);
});

// ── Shaft clearance deviations — small-diameter table values ─────────────

Deno.test("shaft g6 at 2 mm (0–3 range) has es = -2 µm per ISO Table 2", () => {
  // formula would give -round(2.5*1.732^0.34)=-round(3.01)=-3 µm
  const dev = shaftDeviations("g", 6, 2);
  assertEquals(dev.es_um, -2);
});

Deno.test("shaft f7 at 2 mm (0–3 range) has es = -6 µm per ISO Table 2", () => {
  // formula gives -7 µm
  const dev = shaftDeviations("f", 7, 2);
  assertEquals(dev.es_um, -6);
});

Deno.test("shaft g6 at 25 mm has es = -7 µm and ei = -20 µm", () => {
  const dev = shaftDeviations("g", 6, 25);
  assertEquals(dev.es_um, -7);
  assertEquals(dev.ei_um, -20);
});

Deno.test("shaft f7 at 25 mm has es = -20 µm and ei = -41 µm", () => {
  const dev = shaftDeviations("f", 7, 25);
  assertEquals(dev.es_um, -20);
  assertEquals(dev.ei_um, -41);
});

Deno.test("shaft e8 at 25 mm has es = -40 µm", () => {
  const dev = shaftDeviations("e", 8, 25);
  assertEquals(dev.es_um, -40);
});

Deno.test("shaft d11 at 25 mm has es = -65 µm (ISO 286-1:2010 Table 2)", () => {
  const dev = shaftDeviations("d", 11, 25);
  assertEquals(dev.es_um, -65);
  assertEquals(dev.ei_um, -65 - 130); // -195
});

Deno.test("shaft c11 at 25 mm has es = -110 µm (ISO 286-1:2010 Table 2)", () => {
  const dev = shaftDeviations("c", 11, 25);
  assertEquals(dev.es_um, -110);
  assertEquals(dev.ei_um, -110 - 130); // -240
});

Deno.test("shaft c11 at 5 mm (3–6 range) has es = -70 µm (ISO 286-1:2010 Table 2)", () => {
  const dev = shaftDeviations("c", 11, 5);
  assertEquals(dev.es_um, -70);
});

Deno.test("shaft h6 at 25 mm has es = 0 and ei = -13 µm", () => {
  const dev = shaftDeviations("h", 6, 25);
  assertEquals(dev.es_um, 0);
  assertEquals(dev.ei_um, -13);
});

Deno.test("shaft js7 at 25 mm is symmetric: es = 11, ei = -10 µm (IT=21, odd)", () => {
  const dev = shaftDeviations("js", 7, 25);
  assertEquals(dev.es_um, 11);
  assertEquals(dev.ei_um, -10);
});

Deno.test("shaft k6 at 25 mm has ei = 0 µm (D > 3, table value)", () => {
  const dev = shaftDeviations("k", 6, 25);
  assertEquals(dev.ei_um, 0);
});

Deno.test("shaft k6 at 2 mm has ei = +2 µm (D ≤ 3, table value)", () => {
  const dev = shaftDeviations("k", 6, 2);
  assertEquals(dev.ei_um, 2);
});

Deno.test("shaft p6 at 25 mm has ei = +22 µm and es = +35 µm (ISO 286-1:2010 Table 3)", () => {
  const dev = shaftDeviations("p", 6, 25);
  assertEquals(dev.ei_um, 22);
  assertEquals(dev.es_um, 35);
});

Deno.test("shaft n6 at 25 mm has ei = +15 µm (ISO 286-1:2010 Table 3)", () => {
  // formula gives round(5*23.238^0.34)=round(14.57)=15 — matches table
  const dev = shaftDeviations("n", 6, 25);
  assertEquals(dev.ei_um, 15);
});

Deno.test("shaft n6 at 100 mm has ei = +23 µm (ISO 286-1:2010 Table 3; formula gives 24)", () => {
  // Verifies tabulated value prevails over formula divergence at 80–120 mm
  const dev = shaftDeviations("n", 6, 100);
  assertEquals(dev.ei_um, 23);
});

Deno.test("shaft r6 at 25 mm has ei = +28 µm (ISO 286-1:2010 Table 3)", () => {
  const dev = shaftDeviations("r", 6, 25);
  assertEquals(dev.ei_um, 28);
  assertEquals(dev.es_um, 28 + 13); // 41
});

Deno.test("shaft r6 at 2 mm has ei = +10 µm (ISO 286-1:2010 Table 3)", () => {
  const dev = shaftDeviations("r", 6, 2);
  assertEquals(dev.ei_um, 10);
});

Deno.test("shaft r6 at 100 mm has ei = +51 µm (ISO 286-1:2010 Table 3, 80–100 sub-range)", () => {
  const dev = shaftDeviations("r", 6, 100);
  assertEquals(dev.ei_um, 51);
});

// ── Hole deviations ────────────────────────────────────────────────────────

Deno.test("hole H7 at 25 mm has EI = 0 and ES = +21 µm", () => {
  const dev = holeDeviations("H", 7, 25);
  assertEquals(dev.EI_um, 0);
  assertEquals(dev.ES_um, 21);
});

Deno.test("hole JS7 at 25 mm is symmetric: EI = -10, ES = +11 µm", () => {
  const dev = holeDeviations("JS", 7, 25);
  assertEquals(dev.ES_um, 11);
  assertEquals(dev.EI_um, -10);
});

Deno.test("hole G7 at 25 mm has EI = +7, ES = +28 µm (EI = -es_g)", () => {
  const dev = holeDeviations("G", 7, 25);
  assertEquals(dev.EI_um, 7);
  assertEquals(dev.ES_um, 28);
});

Deno.test("hole C7 at 25 mm has EI = +110, ES = +131 µm", () => {
  // EI_C = -es_c = -(-110) = 110; ES = 110+21 = 131
  const dev = holeDeviations("C", 7, 25);
  assertEquals(dev.EI_um, 110);
  assertEquals(dev.ES_um, 131);
});

Deno.test("hole K7 at 25 mm has ES = 0, EI = -21 µm (ES = -ei_k = 0)", () => {
  const dev = holeDeviations("K", 7, 25);
  assertEquals(dev.ES_um, 0);
  assertEquals(dev.EI_um, -21);
});

Deno.test("hole N7 at 25 mm has ES = -15, EI = -36 µm", () => {
  // ES_N = -ei_n = -15; EI = -15-21 = -36
  const dev = holeDeviations("N", 7, 25);
  assertEquals(dev.ES_um, -15);
  assertEquals(dev.EI_um, -36);
});

Deno.test("hole P7 at 25 mm has ES = -22, EI = -43 µm", () => {
  const dev = holeDeviations("P", 7, 25);
  assertEquals(dev.ES_um, -22);
  assertEquals(dev.EI_um, -43);
});

Deno.test("hole R7 at 25 mm has ES = -28, EI = -49 µm", () => {
  const dev = holeDeviations("R", 7, 25);
  assertEquals(dev.ES_um, -28);
  assertEquals(dev.EI_um, -49);
});

Deno.test("hole S7 at 25 mm has ES = -35, EI = -56 µm", () => {
  const dev = holeDeviations("S", 7, 25);
  assertEquals(dev.ES_um, -35);
  assertEquals(dev.EI_um, -56);
});

// ── Full fit computation ────────────────────────────────────────────────────

Deno.test(
  "H7/g6 at 25 mm: clearance fit, hole +21/0, shaft -7/-20, clearance 7–41 µm",
  () => {
    const result = computeFit("H7", "g6", 25);
    assertEquals(result.hole.EI_um, 0);
    assertEquals(result.hole.ES_um, 21);
    assertEquals(result.shaft.es_um, -7);
    assertEquals(result.shaft.ei_um, -20);
    assertEquals(result.fit.type, "clearance");
    assertEquals(result.fit.min_clearance_um, 7);
    assertEquals(result.fit.max_clearance_um, 41);
  },
);

Deno.test("H7/p6 at 25 mm is an interference fit (shaft +22/+35, hole 0/+21)", () => {
  const result = computeFit("H7", "p6", 25);
  assertEquals(result.shaft.ei_um, 22);
  assertEquals(result.shaft.es_um, 35);
  assertEquals(result.fit.type, "interference");
  assertEquals(result.fit.min_interference_um, 1);
  assertEquals(result.fit.max_interference_um, 35);
});

Deno.test("H7/h6 at 25 mm is a clearance fit with min_clearance = 0 µm", () => {
  const result = computeFit("H7", "h6", 25);
  assertEquals(result.fit.type, "clearance");
  assertEquals(result.fit.min_clearance_um, 0);
  assertEquals(result.fit.max_clearance_um, 34);
});

Deno.test("G7/h6 at 25 mm: clearance fit, EI_G=7, ES_G=28, clearance 7–41 µm", () => {
  // Shaft-basis equivalent of H7/g6: same clearance spread, shifted +7 µm
  const result = computeFit("G7", "h6", 25);
  assertEquals(result.hole.EI_um, 7);
  assertEquals(result.hole.ES_um, 28);
  assertEquals(result.shaft.es_um, 0);
  assertEquals(result.shaft.ei_um, -13);
  assertEquals(result.fit.type, "clearance");
  assertEquals(result.fit.min_clearance_um, 7);
  assertEquals(result.fit.max_clearance_um, 41);
});

Deno.test("H7/k6 at 25 mm is a transition fit", () => {
  const result = computeFit("H7", "k6", 25);
  assertEquals(result.fit.type, "transition");
  assertEquals(result.fit.min_clearance_um, -13);
  assertEquals(result.fit.max_clearance_um, 21);
});

Deno.test("H7/n6 at 25 mm is a transition fit (clearance_min=-28, clearance_max=6)", () => {
  const result = computeFit("H7", "n6", 25);
  assertEquals(result.fit.type, "transition");
  assertEquals(result.fit.min_clearance_um, -28);
  assertEquals(result.fit.max_clearance_um, 6);
});

Deno.test("computeFit rejects uppercase shaft letter (G6 must be g6)", () => {
  // G7 is a valid hole letter; G6 as shaft is rejected because shaft must be lowercase.
  assertThrows(() => computeFit("G7", "G6", 25), TypeError);
});

Deno.test("computeFit rejects shaft letter in uppercase", () => {
  assertThrows(() => computeFit("H7", "G6", 25), TypeError);
});

Deno.test("computeFit rejects invalid designation format", () => {
  assertThrows(() => parseDesignation("7H"), TypeError);
  assertThrows(() => parseDesignation("H"), TypeError);
  assertThrows(() => parseDesignation(""), TypeError);
});

Deno.test("computeFit rejects IT grade 0", () => {
  assertThrows(() => parseDesignation("H0"), RangeError);
});

// ── tolerance_limits handler ───────────────────────────────────────────────

Deno.test("tolerance_limits for H7 at 25 mm returns upper=21, lower=0", () => {
  const tool = allTools.find((t) => t.name === "tolerance_limits");
  assert(tool, "tolerance_limits must exist");
  const r = tool.handler({ tolerance_class: "H7", nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  const sc = r.structuredContent;
  assertEquals(sc.upper_um, 21);
  assertEquals(sc.lower_um, 0);
  assertEquals(sc.it_grade, 7);
  assertEquals(sc.IT_um, 21);
  assertEquals(sc.fundamental_deviation_um, 0);
  assertEquals(sc.designation_type, "hole");
});

Deno.test("tolerance_limits for g6 at 25 mm returns upper=-7, lower=-20", () => {
  const tool = allTools.find((t) => t.name === "tolerance_limits");
  assert(tool);
  const r = tool.handler({ tolerance_class: "g6", nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  const sc = r.structuredContent;
  assertEquals(sc.upper_um, -7);
  assertEquals(sc.lower_um, -20);
  assertEquals(sc.designation_type, "shaft");
  assertEquals(sc.fundamental_deviation_um, -7); // es for clearance shaft
});

Deno.test("tolerance_limits for P7 at 25 mm returns upper=-22, lower=-43", () => {
  const tool = allTools.find((t) => t.name === "tolerance_limits");
  assert(tool);
  const r = tool.handler({ tolerance_class: "P7", nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  const sc = r.structuredContent;
  assertEquals(sc.upper_um, -22);
  assertEquals(sc.lower_um, -43);
  assertEquals(sc.designation_type, "hole");
  assertEquals(sc.fundamental_deviation_um, -22); // ES for interference hole
});

Deno.test("tolerance_limits for r6 at 25 mm returns ei=28, es=41", () => {
  const tool = allTools.find((t) => t.name === "tolerance_limits");
  assert(tool);
  const r = tool.handler({ tolerance_class: "r6", nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  const sc = r.structuredContent;
  assertEquals(sc.lower_um, 28); // ei
  assertEquals(sc.upper_um, 41); // es
  assertEquals(sc.fundamental_deviation_um, 28); // ei for interference shaft
});

// ── tolerance_fit_analyze handler ─────────────────────────────────────────

Deno.test("tolerance_fit_analyze for H7/g6 at 25 mm returns clearance [7, 41] µm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_fit_analyze");
  assert(tool);
  const r = tool.handler({
    hole_class: "H7",
    shaft_class: "g6",
    nominal_diameter_mm: 25,
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.clearance_min_um, 7);
  assertEquals(sc.clearance_max_um, 41);
  assertEquals(sc.fit_type, "clearance");
});

Deno.test("tolerance_fit_analyze for H7/p6 at 25 mm: interference, clearance -35 to -1 µm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_fit_analyze");
  assert(tool);
  const r = tool.handler({
    hole_class: "H7",
    shaft_class: "p6",
    nominal_diameter_mm: 25,
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.clearance_min_um, -35);
  assertEquals(sc.clearance_max_um, -1);
  assertEquals(sc.fit_type, "interference");
});

Deno.test("tolerance_fit_analyze for G7/h6 at 25 mm: clearance [7, 41] µm (shaft-basis)", () => {
  const tool = allTools.find((t) => t.name === "tolerance_fit_analyze");
  assert(tool);
  const r = tool.handler({
    hole_class: "G7",
    shaft_class: "h6",
    nominal_diameter_mm: 25,
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.clearance_min_um, 7);
  assertEquals(sc.clearance_max_um, 41);
  assertEquals(sc.fit_type, "clearance");
});

// ── tolerance_stackup handler ──────────────────────────────────────────────

Deno.test("tolerance_stackup: single symmetric contributor ±0.05 mm gives WC [0.95, 1.05] mm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  const r = tool.handler({
    contributors: [
      { name: "A", nominal_mm: 1.0, plus_um: 50, minus_um: 50, direction: 1 },
    ],
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.nominal_mm, 1.0);
  assert(Math.abs((sc.worst_case_max_mm as number) - 1.05) < 1e-9);
  assert(Math.abs((sc.worst_case_min_mm as number) - 0.95) < 1e-9);
  // RSS same as WC for single contributor
  assert(Math.abs((sc.rss_max_mm as number) - 1.05) < 1e-9);
  assert(Math.abs((sc.rss_min_mm as number) - 0.95) < 1e-9);
});

Deno.test("tolerance_stackup: two symmetric contributors each ±0.05 mm gives WC ±0.1, RSS ±0.0707 mm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  const r = tool.handler({
    contributors: [
      { name: "A", nominal_mm: 10.0, plus_um: 50, minus_um: 50, direction: 1 },
      { name: "B", nominal_mm: 5.0, plus_um: 50, minus_um: 50, direction: 1 },
    ],
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.nominal_mm, 15.0);
  assert(Math.abs((sc.worst_case_max_mm as number) - 15.1) < 1e-9);
  assert(Math.abs((sc.worst_case_min_mm as number) - 14.9) < 1e-9);
  // RSS: sqrt(0.05^2 + 0.05^2) = 0.05*sqrt(2) ≈ 0.07071
  const rssExpected = Math.sqrt(0.05 ** 2 + 0.05 ** 2);
  assert(
    Math.abs((sc.rss_max_mm as number) - (15.0 + rssExpected)) < 1e-9,
  );
  assert(
    Math.abs((sc.rss_min_mm as number) - (15.0 - rssExpected)) < 1e-9,
  );
});

Deno.test("tolerance_stackup: direction=-1 contributor subtracts from assembly", () => {
  // Assembly gap = A - B, nominal = 50 - 40 = 10 mm
  // A: 50 ±0.1 mm → plus=100, minus=100 direction=+1
  // B: 40 ±0.05 mm → plus=50, minus=50 direction=-1
  // WC_max: A_max - B_min = 50.1 - 39.95 = 10.15
  // WC_min: A_min - B_max = 49.9 - 40.05 = 9.85
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  const r = tool.handler({
    contributors: [
      { name: "A", nominal_mm: 50.0, plus_um: 100, minus_um: 100, direction: 1 },
      { name: "B", nominal_mm: 40.0, plus_um: 50, minus_um: 50, direction: -1 },
    ],
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assertEquals(sc.nominal_mm, 10.0);
  assert(Math.abs((sc.worst_case_max_mm as number) - 10.15) < 1e-9);
  assert(Math.abs((sc.worst_case_min_mm as number) - 9.85) < 1e-9);
});

Deno.test("tolerance_stackup: unilateral tolerance +0/−0.02 mm", () => {
  // shaft: nominal 25 mm, +0 / -0.02 mm (plus_um=0, minus_um=20)
  // direction=+1
  // WC_max = 25 + 0 = 25, WC_min = 25 - 0.02 = 24.98
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  const r = tool.handler({
    contributors: [
      { name: "shaft", nominal_mm: 25.0, plus_um: 0, minus_um: 20, direction: 1 },
    ],
  }) as { structuredContent: Record<string, unknown> };
  const sc = r.structuredContent;
  assert(Math.abs((sc.worst_case_max_mm as number) - 25.0) < 1e-9);
  assert(Math.abs((sc.worst_case_min_mm as number) - 24.98) < 1e-9);
});

Deno.test("tolerance_stackup rejects invalid direction", () => {
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  assertThrows(
    () =>
      tool.handler({
        contributors: [
          { name: "A", nominal_mm: 10, plus_um: 50, minus_um: 50, direction: 0 },
        ],
      }),
    TypeError,
  );
});

Deno.test("tolerance_stackup rejects negative plus_um", () => {
  const tool = allTools.find((t) => t.name === "tolerance_stackup");
  assert(tool);
  assertThrows(
    () =>
      tool.handler({
        contributors: [
          { name: "A", nominal_mm: 10, plus_um: -5, minus_um: 50, direction: 1 },
        ],
      }),
    TypeError,
  );
});

type StackupBreakdownItem = {
  name: string;
  signed_nominal_mm: number;
  worst_case_upper_excursion_mm: number;
  worst_case_lower_excursion_mm: number;
  rss_upper_sq_mm2: number;
  rss_lower_sq_mm2: number;
};

function reconstructStackup(items: StackupBreakdownItem[]) {
  const nominal_mm = items.reduce((acc, item) => acc + item.signed_nominal_mm, 0);
  const worstCaseUpper = items.reduce(
    (acc, item) => acc + item.worst_case_upper_excursion_mm,
    0,
  );
  const worstCaseLower = items.reduce(
    (acc, item) => acc + item.worst_case_lower_excursion_mm,
    0,
  );
  const rssUpperSq = items.reduce((acc, item) => acc + item.rss_upper_sq_mm2, 0);
  const rssLowerSq = items.reduce((acc, item) => acc + item.rss_lower_sq_mm2, 0);
  return {
    nominal_mm,
    worst_case_max_mm: nominal_mm + worstCaseUpper,
    worst_case_min_mm: nominal_mm - worstCaseLower,
    rss_max_mm: nominal_mm + Math.sqrt(rssUpperSq),
    rss_min_mm: nominal_mm - Math.sqrt(rssLowerSq),
  };
}

Deno.test(
  "tolerance_stackup contributor_breakdown preserves order and reconstructs aggregates",
  () => {
    const tool = allTools.find((t) => t.name === "tolerance_stackup");
    assert(tool);
    const contributors = [
      {
        name: "housing depth",
        nominal_mm: 50.0,
        plus_um: 100,
        minus_um: 40,
        direction: 1,
      },
      {
        name: "shaft length",
        nominal_mm: 40.0,
        plus_um: 80,
        minus_um: 25,
        direction: -1,
      },
      {
        name: "end play",
        nominal_mm: 2.0,
        plus_um: 10,
        minus_um: 10,
        direction: 1,
      },
    ];
    const r = tool.handler({ contributors }) as {
      structuredContent: Record<string, unknown>;
    };
    const sc = r.structuredContent;
    const breakdown = sc.contributor_breakdown as StackupBreakdownItem[];

    assertEquals(Array.isArray(breakdown), true);
    assertEquals(breakdown.length, contributors.length);
    assertEquals(
      breakdown.map((item) => item.name),
      ["housing depth", "shaft length", "end play"],
    );
    // direction=+1 uses plus for the upper excursion and minus for the lower.
    assertEquals(breakdown[0], {
      name: "housing depth",
      signed_nominal_mm: 50,
      worst_case_upper_excursion_mm: 100 / 1000,
      worst_case_lower_excursion_mm: 40 / 1000,
      rss_upper_sq_mm2: (100 / 1000) * (100 / 1000),
      rss_lower_sq_mm2: (40 / 1000) * (40 / 1000),
    });
    // direction=−1 swaps plus/minus onto the opposite assembly side.
    assertEquals(breakdown[1], {
      name: "shaft length",
      signed_nominal_mm: -40,
      worst_case_upper_excursion_mm: 25 / 1000,
      worst_case_lower_excursion_mm: 80 / 1000,
      rss_upper_sq_mm2: (25 / 1000) * (25 / 1000),
      rss_lower_sq_mm2: (80 / 1000) * (80 / 1000),
    });
    assertEquals(breakdown[2], {
      name: "end play",
      signed_nominal_mm: 2,
      worst_case_upper_excursion_mm: 10 / 1000,
      worst_case_lower_excursion_mm: 10 / 1000,
      rss_upper_sq_mm2: (10 / 1000) * (10 / 1000),
      rss_lower_sq_mm2: (10 / 1000) * (10 / 1000),
    });
    for (const item of breakdown) {
      assert(item.worst_case_upper_excursion_mm >= 0);
      assert(item.worst_case_lower_excursion_mm >= 0);
      assert(item.rss_upper_sq_mm2 >= 0);
      assert(item.rss_lower_sq_mm2 >= 0);
    }

    const reconstructed = reconstructStackup(breakdown);
    assertEquals(reconstructed.nominal_mm, sc.nominal_mm);
    assertEquals(reconstructed.worst_case_max_mm, sc.worst_case_max_mm);
    assertEquals(reconstructed.worst_case_min_mm, sc.worst_case_min_mm);
    assertEquals(reconstructed.rss_max_mm, sc.rss_max_mm);
    assertEquals(reconstructed.rss_min_mm, sc.rss_min_mm);
    assertEquals(sc.violations, []);
  },
);

Deno.test(
  "tolerance_stackup outputSchema requires a closed contributor_breakdown item",
  () => {
    const tool = allTools.find((t) => t.name === "tolerance_stackup");
    assert(tool);
    const schema = tool.outputSchema as Record<string, unknown>;
    const required = schema.required as string[];
    assert(required.includes("contributor_breakdown"));
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const breakdown = properties.contributor_breakdown;
    assertEquals(breakdown.type, "array");
    const items = breakdown.items as Record<string, unknown>;
    assertEquals(items.type, "object");
    assertEquals(items.additionalProperties, false);
    assertEquals(items.required, [
      "name",
      "signed_nominal_mm",
      "worst_case_upper_excursion_mm",
      "worst_case_lower_excursion_mm",
      "rss_upper_sq_mm2",
      "rss_lower_sq_mm2",
    ]);
  },
);

// ── Output schema contracts ────────────────────────────────────────────────

Deno.test("All tolerance tools declare closed outputSchemas with required fields", () => {
  for (const tool of allTools) {
    const schema = tool.outputSchema as Record<string, unknown>;
    assertEquals(
      schema.additionalProperties,
      false,
      `${tool.name}: outputSchema.additionalProperties must be false`,
    );
    const required = schema.required as string[];
    assert(
      required.includes("not_checked"),
      `${tool.name}: outputSchema.required must include 'not_checked'`,
    );
    assert(
      required.includes("violations"),
      `${tool.name}: outputSchema.required must include 'violations'`,
    );
    assert(
      required.includes("provenance"),
      `${tool.name}: outputSchema.required must include 'provenance'`,
    );
  }
});

Deno.test("tolerance_fit tool handler returns correct structured content for H7/g6", () => {
  const tool = allTools.find((t) => t.name === "tolerance_fit");
  assert(tool, "tolerance_fit tool must exist");
  const result = tool.handler({
    hole_code: "H7",
    shaft_code: "g6",
    nominal_diameter_mm: 25,
  }) as { structuredContent: Record<string, unknown> };
  const sc = result.structuredContent;
  assertEquals((sc.hole as Record<string, unknown>).EI_um, 0);
  assertEquals((sc.hole as Record<string, unknown>).ES_um, 21);
  assertEquals((sc.shaft as Record<string, unknown>).es_um, -7);
  assertEquals((sc.shaft as Record<string, unknown>).ei_um, -20);
  assertEquals((sc.fit as Record<string, unknown>).type, "clearance");
  assertEquals(sc.provenance, "ISO 286-1:2010 formulas/tables");
});

Deno.test("tolerance_fit rejects non-H hole letter with recovery hint to tolerance_fit_analyze", () => {
  const tool = allTools.find((t) => t.name === "tolerance_fit");
  assert(tool, "tolerance_fit tool must exist");
  assertThrows(
    () => tool.handler({ hole_code: "G7", shaft_code: "h6", nominal_diameter_mm: 25 }),
    TypeError,
    "tolerance_fit_analyze",
  );
});

Deno.test("tolerance_it tool handler returns IT7 = 21 µm at 25 mm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_it");
  assert(tool, "tolerance_it tool must exist");
  const result = tool.handler({ grade: 7, nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  assertEquals(result.structuredContent.IT_um, 21);
  assertEquals(result.structuredContent.provenance, "ISO 286-1:2010 formulas/tables");
});

Deno.test("registered tolerance tools match the public capability surface", () => {
  const names = allTools.map((t) => t.name).sort();
  assertEquals(names, [
    "tolerance_fit",
    "tolerance_fit_analyze",
    "tolerance_it",
    "tolerance_limits",
    "tolerance_stackup",
  ]);
});

Deno.test("All 13 diameter ranges are covered by DIAMETER_RANGES", () => {
  assertEquals(DIAMETER_RANGES.length, 13);
});

// ── CLI parsing ────────────────────────────────────────────────────────────

Deno.test("parseCli returns default port 3019 when no args given", () => {
  const opts = parseCli([]);
  assertEquals(opts.port, 3019);
  assertEquals(opts.hostname, "127.0.0.1");
});

Deno.test("parseCli accepts --port=3030", () => {
  assertEquals(parseCli(["--port=3030"]).port, 3030);
});

Deno.test("parseCli accepts --port 3031", () => {
  assertEquals(parseCli(["--port", "3031"]).port, 3031);
});

Deno.test("parseCli rejects unknown argument", () => {
  assertThrows(() => parseCli(["--unknown"]), TypeError);
});

Deno.test("parseCli rejects non-integer port", () => {
  assertThrows(() => parseCli(["--port=abc"]), TypeError);
});

// ── MCP wire contract ──────────────────────────────────────────────────────

let _portCounter = 19100;
function freePort(): number {
  return _portCounter++;
}

async function rpc(
  url: string,
  method: string,
  params: Record<string, unknown> = {},
  name?: string,
): Promise<{ response: Response; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "mcp-protocol-version": PROTOCOL_VERSION,
      "mcp-method": method,
      ...(typeof name === "string" ? { "mcp-name": name } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        ...params,
        _meta: META,
      },
    }),
  });
  const body = await response.json() as Record<string, unknown>;
  return { response, body };
}

Deno.test(
  "tolerance server starts and serves stateless MCP discover/tools/list",
  async () => {
    const { app } = createToleranceServer({ logger: () => {} });
    const port = freePort();
    const http = await app.startHttp({
      port,
      hostname: "127.0.0.1",
      onListen: () => {},
    });
    const url = `http://127.0.0.1:${port}/mcp`;

    try {
      const discovered = await rpc(url, "server/discover");
      assertEquals(discovered.response.headers.get("mcp-session-id"), null);
      const discoverResult = discovered.body.result as Record<string, unknown>;
      assertEquals(discoverResult.serverInfo, {
        name: "mcp-tolerance",
        version: "0.3.0",
      });

      const listed = await rpc(url, "tools/list");
      const tools = (listed.body.result as Record<string, unknown>)
        .tools as Array<Record<string, unknown>>;
      const names = tools.map((t) => t.name as string).sort();
      assertEquals(names, [
        "tolerance_fit",
        "tolerance_fit_analyze",
        "tolerance_it",
        "tolerance_limits",
        "tolerance_stackup",
      ]);

      for (const tool of tools) {
        assertEquals(
          (tool.outputSchema as Record<string, unknown>).additionalProperties,
          false,
          `${tool.name} outputSchema must be closed`,
        );
      }
    } finally {
      await http.shutdown();
    }
  },
);

Deno.test(
  "tolerance_fit via MCP tools/call returns correct deviations for H7/g6 at 25 mm",
  async () => {
    const { app } = createToleranceServer({ logger: () => {} });
    const port = freePort();
    const http = await app.startHttp({
      port,
      hostname: "127.0.0.1",
      onListen: () => {},
    });
    const url = `http://127.0.0.1:${port}/mcp`;

    try {
      const called = await rpc(
        url,
        "tools/call",
        {
          name: "tolerance_fit",
          arguments: {
            hole_code: "H7",
            shaft_code: "g6",
            nominal_diameter_mm: 25,
          },
        },
        "tolerance_fit",
      );

      const result = called.body.result as Record<string, unknown>;
      const sc = result.structuredContent as Record<string, unknown>;

      assertEquals((sc.hole as Record<string, unknown>).EI_um, 0);
      assertEquals((sc.hole as Record<string, unknown>).ES_um, 21);
      assertEquals((sc.shaft as Record<string, unknown>).es_um, -7);
      assertEquals((sc.shaft as Record<string, unknown>).ei_um, -20);
      assertEquals((sc.fit as Record<string, unknown>).type, "clearance");
      assertEquals((sc.fit as Record<string, unknown>).min_clearance_um, 7);
      assertEquals((sc.fit as Record<string, unknown>).max_clearance_um, 41);
    } finally {
      await http.shutdown();
    }
  },
);

Deno.test(
  "tolerance_stackup via MCP tools/call: two contributors, WC ±0.1 mm",
  async () => {
    const { app } = createToleranceServer({ logger: () => {} });
    const port = freePort();
    const http = await app.startHttp({
      port,
      hostname: "127.0.0.1",
      onListen: () => {},
    });
    const url = `http://127.0.0.1:${port}/mcp`;

    try {
      const called = await rpc(
        url,
        "tools/call",
        {
          name: "tolerance_stackup",
          arguments: {
            contributors: [
              { name: "A", nominal_mm: 10, plus_um: 50, minus_um: 50, direction: 1 },
              { name: "B", nominal_mm: 5, plus_um: 50, minus_um: 50, direction: 1 },
            ],
          },
        },
        "tolerance_stackup",
      );

      const sc = (called.body.result as Record<string, unknown>)
        .structuredContent as Record<string, unknown>;
      assertEquals(sc.nominal_mm, 15.0);
      assert(Math.abs((sc.worst_case_max_mm as number) - 15.1) < 1e-9);
      assert(Math.abs((sc.worst_case_min_mm as number) - 14.9) < 1e-9);
    } finally {
      await http.shutdown();
    }
  },
);
