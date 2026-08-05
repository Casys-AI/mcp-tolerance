/**
 * mcp-tolerance server tests.
 *
 * Validates:
 * - ISO 286-1:2010 engine formulas against published table values.
 * - MCP wire contract (stateless, server/discover, tools/list, tools/call).
 * - Output schema contracts (closed schema, required fields).
 * - CLI parsing.
 *
 * No external binaries required — all tests are pure TypeScript.
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
  // 0.45 * 23.238^(1/3) + 0.001 * 23.238 ≈ 1.307
  assert(Math.abs(i - 1.307) < 0.001, `Expected ≈1.307, got ${i}`);
});

// Key ISO 286-1 table values — these are the normative cross-checks.

Deno.test("IT7 at 25 mm equals 21 µm (ISO 286-1:2010 Table 1)", () => {
  // D = sqrt(18*30) = 23.238 mm, i = 1.304 µm, IT7 = 16*i = 20.87 → 21
  assertEquals(fundamentalTolerance(7, 25), 21);
});

Deno.test("IT6 at 25 mm equals 13 µm (ISO 286-1:2010 Table 1)", () => {
  // 10 * 1.304 = 13.04 → 13
  assertEquals(fundamentalTolerance(6, 25), 13);
});

Deno.test("IT8 at 25 mm equals 33 µm (ISO 286-1:2010 Table 1)", () => {
  // 25 * 1.304 = 32.6 → 33
  assertEquals(fundamentalTolerance(8, 25), 33);
});

Deno.test("IT11 at 25 mm equals 130 µm (ISO 286-1:2010 Table 1)", () => {
  // 100 * 1.304 = 130.4 → 130
  assertEquals(fundamentalTolerance(11, 25), 130);
});

Deno.test("IT7 at 50 mm equals 25 µm (ISO 286-1:2010 Table 1)", () => {
  // D = sqrt(30*50) = 38.73, i = 0.45*3.387+0.039 = 1.565, IT7 = 16*1.565 = 25.0
  assertEquals(fundamentalTolerance(7, 50), 25);
});

Deno.test("IT3 at 25 mm is the tabulated value 4 µm", () => {
  // Range 18–30: IT3 = 4 from Table 1
  assertEquals(fundamentalTolerance(3, 25), 4);
});

// Shaft g: es = -round(2.5 * D^0.34)

Deno.test("shaft g6 at 25 mm has es = -7 µm and ei = -20 µm", () => {
  // es = -round(2.5 * 23.238^0.34) = -round(7.28) = -7
  // ei = -7 - IT6 = -7 - 13 = -20
  const dev = shaftDeviations("g", 6, 25);
  assertEquals(dev.es_um, -7);
  assertEquals(dev.ei_um, -20);
});

Deno.test("shaft f7 at 25 mm has es = -20 µm and ei = -41 µm", () => {
  // es = -round(5.5 * 23.238^0.41) = -round(20.0) = -20
  // ei = -20 - IT7 = -20 - 21 = -41
  const dev = shaftDeviations("f", 7, 25);
  assertEquals(dev.es_um, -20);
  assertEquals(dev.ei_um, -41);
});

Deno.test("shaft e8 at 25 mm has es = -40 µm", () => {
  // es = -round(11 * 23.238^0.41) = -round(40.0) = -40
  const dev = shaftDeviations("e", 8, 25);
  assertEquals(dev.es_um, -40);
});

Deno.test("shaft h6 at 25 mm has es = 0 and ei = -13 µm", () => {
  const dev = shaftDeviations("h", 6, 25);
  assertEquals(dev.es_um, 0);
  assertEquals(dev.ei_um, -13);
});

Deno.test("shaft js7 at 25 mm is symmetric: es = 11, ei = -10 µm (IT=21, odd)", () => {
  // IT7 = 21 (odd): es = ceil(21/2) = 11, ei = -floor(21/2) = -10
  const dev = shaftDeviations("js", 7, 25);
  assertEquals(dev.es_um, 11);
  assertEquals(dev.ei_um, -10);
});

Deno.test("shaft k6 at 25 mm has ei = 0 µm (D > 3, IT ≤ 8)", () => {
  const dev = shaftDeviations("k", 6, 25);
  assertEquals(dev.ei_um, 0);
});

Deno.test("shaft p6 at 25 mm has ei = +22 µm (ISO 286-1:2010 Table 3)", () => {
  // Table value for range 18–30 mm
  const dev = shaftDeviations("p", 6, 25);
  assertEquals(dev.ei_um, 22);
  // es = 22 + IT6 = 22 + 13 = 35
  assertEquals(dev.es_um, 35);
});

// Hole H

Deno.test("hole H7 at 25 mm has EI = 0 and ES = +21 µm", () => {
  const dev = holeDeviations("H", 7, 25);
  assertEquals(dev.EI_um, 0);
  assertEquals(dev.ES_um, 21);
});

// Full fit computation — the three canonical cross-checks from the task brief.

Deno.test(
  "H7/g6 at 25 mm: clearance fit, hole +21/0, shaft -7/-20, clearance 7–41 µm",
  () => {
    const result = computeFit("H7", "g6", 25);
    // Hole
    assertEquals(result.hole.EI_um, 0);
    assertEquals(result.hole.ES_um, 21);
    // Shaft
    assertEquals(result.shaft.es_um, -7);
    assertEquals(result.shaft.ei_um, -20);
    // Fit
    assertEquals(result.fit.type, "clearance");
    assertEquals(result.fit.min_clearance_um, 7); // EI - es = 0 - (-7) = 7
    assertEquals(result.fit.max_clearance_um, 41); // ES - ei = 21 - (-20) = 41
  },
);

Deno.test("H7/p6 at 25 mm is an interference fit (shaft +22/+35, hole 0/+21)", () => {
  const result = computeFit("H7", "p6", 25);
  assertEquals(result.shaft.ei_um, 22);
  assertEquals(result.shaft.es_um, 35);
  assertEquals(result.fit.type, "interference");
  // min interference = ei_shaft - ES_hole = 22 - 21 = 1 µm
  assertEquals(result.fit.min_interference_um, 1);
  // max interference = es_shaft - EI_hole = 35 - 0 = 35 µm
  assertEquals(result.fit.max_interference_um, 35);
});

Deno.test("H7/h6 at 25 mm is a clearance fit (reference fit)", () => {
  const result = computeFit("H7", "h6", 25);
  assertEquals(result.fit.type, "clearance");
  assertEquals(result.fit.min_clearance_um, 0); // just touching at maximum material
  assertEquals(result.fit.max_clearance_um, 34); // IT7 + IT6 = 21 + 13
});

Deno.test("computeFit rejects unsupported hole letter", () => {
  assertThrows(() => computeFit("G7", "g6", 25), TypeError);
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

Deno.test("tolerance_fit tool handler returns correct structured content", () => {
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

Deno.test("tolerance_it tool handler returns IT7 = 21 µm at 25 mm", () => {
  const tool = allTools.find((t) => t.name === "tolerance_it");
  assert(tool, "tolerance_it tool must exist");
  const result = tool.handler({ grade: 7, nominal_diameter_mm: 25 }) as {
    structuredContent: Record<string, unknown>;
  };
  assertEquals(result.structuredContent.IT_um, 21);
  assertEquals(result.structuredContent.provenance, "ISO 286-1:2010 formulas/tables");
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
      // server/discover: stateless — no session cookie, correct server identity
      const discovered = await rpc(url, "server/discover");
      assertEquals(discovered.response.headers.get("mcp-session-id"), null);
      const discoverResult = discovered.body.result as Record<string, unknown>;
      assertEquals(discoverResult.serverInfo, {
        name: "mcp-tolerance",
        version: "0.1.0",
      });

      // tools/list: the two tolerance tools appear
      const listed = await rpc(url, "tools/list");
      const tools = (listed.body.result as Record<string, unknown>)
        .tools as Array<Record<string, unknown>>;
      const names = tools.map((t) => t.name as string).sort();
      assertEquals(names, ["tolerance_fit", "tolerance_it"]);

      // Each tool has a closed outputSchema
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
      assertEquals(
        (sc.fit as Record<string, unknown>).min_clearance_um,
        7,
      );
      assertEquals(
        (sc.fit as Record<string, unknown>).max_clearance_um,
        41,
      );
    } finally {
      await http.shutdown();
    }
  },
);
