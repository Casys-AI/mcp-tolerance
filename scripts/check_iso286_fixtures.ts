/**
 * Cross-check the ISO 286-1 engine against its committed normative fixtures.
 *
 * The check is intentionally fail-closed. It validates exact fixture coverage
 * for every engine table row, cell and finer sub-range before testing runtime
 * results. A partial fixture therefore cannot produce a false green release.
 *
 * Usage:
 *   deno run --allow-read scripts/check_iso286_fixtures.ts
 */

import {
  computeFit,
  DIAMETER_RANGES,
  fundamentalTolerance,
  holeDeviations,
  ISO286_TABLES_FOR_FIXTURE_CHECK,
  shaftDeviations,
} from "../src/api/iso286.ts";

const DEFAULT_FIXTURE_PATH = new URL(
  "../tests/fixtures/iso286_table_values.json",
  import.meta.url,
).pathname;

function fixturePathFromArgs(): string {
  if (Deno.args.length === 0) return DEFAULT_FIXTURE_PATH;
  if (Deno.args.length === 1) return Deno.args[0];
  throw new TypeError("Usage: check_iso286_fixtures.ts [fixture-json-path]");
}

type Pair = readonly [upperInclusiveMm: number, deviationUm: number];
type PairTable = Record<string, Pair[]>;

interface ITGradeEntry {
  nominal_mm: number;
  range: [number, number];
  source: string;
  grades: Record<string, number>;
}

interface ShaftDevEntry {
  nominal_mm: number;
  range: [number, number];
  es_um?: number;
  ei_um?: number;
  source: string;
}

interface FitResultEntry {
  description: string;
  hole_code: string;
  shaft_code: string;
  nominal_mm: number;
  hole_EI_um: number;
  hole_ES_um: number;
  shaft_ei_um: number;
  shaft_es_um: number;
  fit_type: string;
  clearance_min_um: number;
  clearance_max_um: number;
  source: string;
}

interface HoleDevEntry {
  description: string;
  hole_code: string;
  nominal_mm: number;
  EI_um: number;
  ES_um: number;
  source: string;
}

interface Fixture {
  it_grades: ITGradeEntry[];
  shaft_clearance_deviations: Record<string, ShaftDevEntry[]>;
  shaft_interference_deviations: Record<string, ShaftDevEntry[]>;
  shaft_table4_es_um: PairTable;
  shaft_table4_subrange_es_um: PairTable;
  shaft_table5_ei_um: PairTable;
  shaft_table5_subrange_ei_um: PairTable;
  fit_results: FitResultEntry[];
  hole_deviations: HoleDevEntry[];
}

let failures = 0;
let checks = 0;

function fail(label: string, detail: string): void {
  console.error(`FAIL  ${label}: ${detail}`);
  failures++;
}

function check(
  label: string,
  computed: number,
  expected: number,
  source: string,
): void {
  checks++;
  if (computed !== expected) {
    fail(label, `computed=${computed}, expected=${expected}  (${source})`);
    return;
  }
  console.log(`  ok  ${label} = ${computed} µm`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fixtureRecord(label: string, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(label, "must be an object");
    return {};
  }
  return value;
}

function exactKeys(
  label: string,
  actual: Record<string, unknown>,
  expected: readonly string[],
): void {
  const actualKeys = Object.keys(actual).filter((key) => !key.startsWith("_")).sort();
  const expectedKeys = [...expected].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail(
      label,
      `keys must be exactly [${expectedKeys.join(", ")}], got [${
        actualKeys.join(", ")
      }]`,
    );
  }
}

function asPair(label: string, value: unknown): Pair | undefined {
  if (
    !Array.isArray(value) || value.length !== 2 ||
    typeof value[0] !== "number" || typeof value[1] !== "number"
  ) {
    fail(label, "must be a [upperInclusiveMm, deviationUm] numeric pair");
    return undefined;
  }
  return [value[0], value[1]];
}

function mainRangePairs(
  table: Record<string, readonly number[]>,
): Record<string, readonly Pair[]> {
  return Object.fromEntries(
    Object.entries(table).map(([letter, values]) => [
      letter,
      values.map((value, rangeIndex) =>
        [DIAMETER_RANGES[rangeIndex][1], value] as Pair
      ),
    ]),
  );
}

function verifyDeviationTable(
  fixtureSection: string,
  fixtureValue: unknown,
  engineTable: Record<string, readonly Pair[]>,
  deviation: "es" | "ei",
  source: string,
): void {
  const fixtureTable = fixtureRecord(fixtureSection, fixtureValue);
  const letters = Object.keys(engineTable);
  exactKeys(fixtureSection, fixtureTable, letters);

  for (const letter of letters) {
    const expectedRows = engineTable[letter];
    const fixtureRows = fixtureTable[letter];
    if (!Array.isArray(fixtureRows)) {
      fail(`${fixtureSection}.${letter}`, "must be an array of required table rows");
      continue;
    }
    if (fixtureRows.length !== expectedRows.length) {
      fail(
        `${fixtureSection}.${letter}`,
        `requires ${expectedRows.length} rows, got ${fixtureRows.length}`,
      );
    }

    for (let index = 0; index < expectedRows.length; index++) {
      const expected = expectedRows[index];
      const actual = asPair(
        `${fixtureSection}.${letter}[${index}]`,
        fixtureRows[index],
      );
      if (actual === undefined) continue;
      check(
        `${fixtureSection}.${letter}[${index}] upper bound`,
        actual[0],
        expected[0],
        source,
      );
      check(
        `${fixtureSection}.${letter}[${index}] fixture value`,
        actual[1],
        expected[1],
        source,
      );

      const runtime = shaftDeviations(letter, 6, actual[0]);
      check(
        `${letter} ${deviation} @ ${actual[0]} mm (upper-inclusive table edge)`,
        deviation === "es" ? runtime.es_um : runtime.ei_um,
        actual[1],
        source,
      );
    }
  }
}

function verifyITFixture(fixture: Fixture): void {
  const entries = fixture.it_grades;
  if (!Array.isArray(entries)) {
    fail("it_grades", "must be an array");
    return;
  }
  if (entries.length !== DIAMETER_RANGES.length) {
    fail("it_grades", `requires ${DIAMETER_RANGES.length} rows, got ${entries.length}`);
  }

  const expectedGradeKeys = Array.from({ length: 12 }, (_, index) => `IT${index + 1}`);
  for (let rangeIndex = 0; rangeIndex < DIAMETER_RANGES.length; rangeIndex++) {
    const entry = entries[rangeIndex];
    if (!isRecord(entry)) {
      fail(`it_grades[${rangeIndex}]`, "must be a table-row object");
      continue;
    }
    const expectedRange = DIAMETER_RANGES[rangeIndex];
    const range = entry.range;
    if (
      !Array.isArray(range) || range.length !== 2 || range[0] !== expectedRange[0] ||
      range[1] !== expectedRange[1]
    ) {
      fail(
        `it_grades[${rangeIndex}].range`,
        `must be [${expectedRange[0]}, ${expectedRange[1]}]`,
      );
    }

    const nominal = entry.nominal_mm;
    if (
      typeof nominal !== "number" || nominal <= expectedRange[0] ||
      nominal > expectedRange[1]
    ) {
      fail(
        `it_grades[${rangeIndex}].nominal_mm`,
        `must be in (${expectedRange[0]}, ${expectedRange[1]}]`,
      );
      continue;
    }

    const grades = fixtureRecord(`it_grades[${rangeIndex}].grades`, entry.grades);
    exactKeys(`it_grades[${rangeIndex}].grades`, grades, expectedGradeKeys);
    for (let grade = 1; grade <= 12; grade++) {
      const expected = grade <= 4
        ? ISO286_TABLES_FOR_FIXTURE_CHECK.it1To4[rangeIndex][grade - 1]
        : ISO286_TABLES_FOR_FIXTURE_CHECK.it5To12[rangeIndex][grade - 5];
      const fixtureValue = grades[`IT${grade}`];
      if (typeof fixtureValue !== "number") {
        fail(`IT${grade} fixture @ ${nominal} mm`, "must be numeric");
        continue;
      }
      check(`IT${grade} fixture @ ${nominal} mm`, fixtureValue, expected, entry.source);
      check(
        `IT${grade} @ ${nominal} mm`,
        fundamentalTolerance(grade, nominal),
        fixtureValue,
        entry.source,
      );
    }
  }
}

function verifyFocusedShaftRegressions(fixture: Fixture): void {
  for (const [letter, entries] of Object.entries(fixture.shaft_clearance_deviations)) {
    for (const entry of entries) {
      if (entry.es_um === undefined) continue;
      check(
        `${letter} es @ ${entry.nominal_mm} mm`,
        shaftDeviations(letter, 6, entry.nominal_mm).es_um,
        entry.es_um,
        entry.source,
      );
    }
  }
  for (
    const [letter, entries] of Object.entries(fixture.shaft_interference_deviations)
  ) {
    for (const entry of entries) {
      if (entry.ei_um === undefined) continue;
      check(
        `${letter} ei @ ${entry.nominal_mm} mm`,
        shaftDeviations(letter, 6, entry.nominal_mm).ei_um,
        entry.ei_um,
        entry.source,
      );
    }
  }
}

function verifyHoleRegressions(fixture: Fixture): void {
  const required = new Set(["C7@40", "C7@40.001", "R7@80", "S7@80"]);
  for (const entry of fixture.hole_deviations) {
    const match = entry.hole_code.match(/^([A-Z]{1,2})(\d+)$/);
    if (!match) {
      fail(`hole deviation ${entry.hole_code}`, "cannot parse tolerance class");
      continue;
    }
    const [, letter, gradeText] = match;
    const grade = parseInt(gradeText, 10);
    const dev = holeDeviations(letter, grade, entry.nominal_mm);
    check(
      `${entry.hole_code} EI @ ${entry.nominal_mm} mm`,
      dev.EI_um,
      entry.EI_um,
      entry.source,
    );
    check(
      `${entry.hole_code} ES @ ${entry.nominal_mm} mm`,
      dev.ES_um,
      entry.ES_um,
      entry.source,
    );
    required.delete(`${entry.hole_code}@${entry.nominal_mm}`);
  }
  for (const regression of required) {
    fail("hole_deviations", `missing required regression ${regression}`);
  }
}

function verifyFitRegressions(fixture: Fixture): void {
  const required = new Set(["C7/c6@40.001", "H7/g6@25", "H7/p6@25"]);
  for (const entry of fixture.fit_results) {
    const result = computeFit(entry.hole_code, entry.shaft_code, entry.nominal_mm);
    const label = `${entry.hole_code}/${entry.shaft_code} @ ${entry.nominal_mm} mm`;
    check(`${label} — hole EI`, result.hole.EI_um, entry.hole_EI_um, entry.source);
    check(`${label} — hole ES`, result.hole.ES_um, entry.hole_ES_um, entry.source);
    check(`${label} — shaft ei`, result.shaft.ei_um, entry.shaft_ei_um, entry.source);
    check(`${label} — shaft es`, result.shaft.es_um, entry.shaft_es_um, entry.source);
    checks++;
    if (result.fit.type !== entry.fit_type) {
      fail(
        `${label} fit type`,
        `computed=${result.fit.type}, expected=${entry.fit_type}`,
      );
    } else {
      console.log(`  ok  ${label} fit type = ${result.fit.type}`);
    }
    check(
      `${label} clearance minimum`,
      result.fit.min_clearance_um,
      entry.clearance_min_um,
      entry.source,
    );
    check(
      `${label} clearance maximum`,
      result.fit.max_clearance_um,
      entry.clearance_max_um,
      entry.source,
    );
    required.delete(`${entry.hole_code}/${entry.shaft_code}@${entry.nominal_mm}`);
  }
  for (const regression of required) {
    fail("fit_results", `missing required regression ${regression}`);
  }
}

const raw = await Deno.readTextFile(fixturePathFromArgs());
const fixture = JSON.parse(raw) as Fixture;

console.log("\n── ISO 286-1 Table 1 complete fixture ─────────────────────────");
verifyITFixture(fixture);

console.log("\n── ISO 286-1 Table 4 complete fixture ─────────────────────────");
verifyDeviationTable(
  "shaft_table4_es_um",
  fixture.shaft_table4_es_um,
  mainRangePairs(ISO286_TABLES_FOR_FIXTURE_CHECK.table4ShaftEs),
  "es",
  "ISO 286-1:2010 Table 4",
);
verifyDeviationTable(
  "shaft_table4_subrange_es_um",
  fixture.shaft_table4_subrange_es_um,
  ISO286_TABLES_FOR_FIXTURE_CHECK.table4ShaftEsSubranges,
  "es",
  "ISO 286-1:2010 Table 4",
);

console.log("\n── ISO 286-1 Table 5 complete fixture ─────────────────────────");
verifyDeviationTable(
  "shaft_table5_ei_um",
  fixture.shaft_table5_ei_um,
  mainRangePairs(ISO286_TABLES_FOR_FIXTURE_CHECK.table5ShaftEi),
  "ei",
  "ISO 286-1:2010 Table 5",
);
verifyDeviationTable(
  "shaft_table5_subrange_ei_um",
  fixture.shaft_table5_subrange_ei_um,
  ISO286_TABLES_FOR_FIXTURE_CHECK.table5ShaftEiSubranges,
  "ei",
  "ISO 286-1:2010 Table 5",
);

console.log("\n── Focused shaft, hole and fit regressions ──────────────────────");
verifyFocusedShaftRegressions(fixture);
verifyHoleRegressions(fixture);
verifyFitRegressions(fixture);

if (checks === 0) {
  fail("fixture checker", "performed zero checks");
}

console.log(`\n${checks} checks, ${failures} failures`);
if (failures > 0) {
  console.error(
    "\nCROSS-CHECK FAILED: fixtures are incomplete or diverge from the engine.",
  );
  Deno.exit(1);
}

console.log(
  "\nCROSS-CHECK PASSED: complete fixtures match the engine tables and regressions.",
);
