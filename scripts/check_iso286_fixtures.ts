/**
 * Cross-check: compare the ISO 286-1 engine against normative table values.
 *
 * Reads tests/fixtures/iso286_table_values.json and verifies that the engine
 * produces the exact values specified in the standard's tables.
 *
 * This script fails with exit code 1 if any divergence is found.
 * It does NOT commit or write any file — it is read-only diagnostic.
 *
 * Usage:
 *   deno run --allow-read scripts/check_iso286_fixtures.ts
 */

import {
  computeFit,
  fundamentalTolerance,
  holeDeviations,
  shaftDeviations,
} from "../src/api/iso286.ts";

const FIXTURE_PATH = new URL(
  "../tests/fixtures/iso286_table_values.json",
  import.meta.url,
).pathname;

// ── Types matching fixture JSON ─────────────────────────────────────────────

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
  fit_results: FitResultEntry[];
  hole_deviations: HoleDevEntry[];
}

// ── Runner ─────────────────────────────────────────────────────────────────

let failures = 0;
let checks = 0;

function check(
  label: string,
  computed: number,
  expected: number,
  source: string,
): void {
  checks++;
  if (computed !== expected) {
    console.error(
      `FAIL  ${label}: computed=${computed}, expected=${expected}  (${source})`,
    );
    failures++;
  } else {
    console.log(`  ok  ${label} = ${computed} µm`);
  }
}

const raw = await Deno.readTextFile(FIXTURE_PATH);
const fixture = JSON.parse(raw) as Fixture;

// ── IT grade table cross-check ─────────────────────────────────────────────

console.log("\n── IT grades ──────────────────────────────────────────────────");
for (const entry of fixture.it_grades) {
  for (const [key, expected] of Object.entries(entry.grades)) {
    const grade = parseInt(key.replace("IT", ""), 10);
    const computed = fundamentalTolerance(grade, entry.nominal_mm);
    check(
      `IT${grade} @ ${entry.nominal_mm} mm (range ${entry.range[0]}–${entry.range[1]})`,
      computed,
      expected,
      entry.source,
    );
  }
}

// ── Clearance shaft es cross-check ────────────────────────────────────────

console.log("\n── Shaft clearance deviations (es) ───────────────────────────");
for (const [letter, entries] of Object.entries(fixture.shaft_clearance_deviations)) {
  for (const entry of entries) {
    if (entry.es_um === undefined) continue;
    // We need a grade to call shaftDeviations; use grade 6 (IT6 exists for all ranges)
    // but we only care about es (independent of grade for clearance shafts).
    // The easiest check: shaftDeviations returns es from the table directly.
    const dev = shaftDeviations(letter, 6, entry.nominal_mm);
    check(
      `${letter} es @ ${entry.nominal_mm} mm`,
      dev.es_um,
      entry.es_um,
      entry.source,
    );
  }
}

// ── Interference shaft ei cross-check ─────────────────────────────────────

console.log("\n── Shaft interference deviations (ei) ────────────────────────");
for (const [letter, entries] of Object.entries(fixture.shaft_interference_deviations)) {
  for (const entry of entries) {
    if (entry.ei_um === undefined) continue;
    const dev = shaftDeviations(letter, 6, entry.nominal_mm);
    check(
      `${letter} ei @ ${entry.nominal_mm} mm`,
      dev.ei_um,
      entry.ei_um,
      entry.source,
    );
  }
}

// ── Hole deviation cross-check ─────────────────────────────────────────────

console.log("\n── Hole deviations ───────────────────────────────────────────");
for (const entry of fixture.hole_deviations) {
  const match = entry.hole_code.match(/^([A-Z]{1,2})(\d+)$/);
  if (!match) {
    console.error(`SKIP  ${entry.hole_code}: cannot parse`);
    continue;
  }
  const letter = match[1];
  const grade = parseInt(match[2], 10);
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
}

// ── Fit result cross-check ─────────────────────────────────────────────────

console.log("\n── Fit results ───────────────────────────────────────────────");
for (const entry of fixture.fit_results) {
  const result = computeFit(entry.hole_code, entry.shaft_code, entry.nominal_mm);
  check(
    `${entry.hole_code}/${entry.shaft_code} @ ${entry.nominal_mm} mm — hole EI`,
    result.hole.EI_um,
    entry.hole_EI_um,
    entry.source,
  );
  check(
    `${entry.hole_code}/${entry.shaft_code} @ ${entry.nominal_mm} mm — hole ES`,
    result.hole.ES_um,
    entry.hole_ES_um,
    entry.source,
  );
  check(
    `${entry.hole_code}/${entry.shaft_code} @ ${entry.nominal_mm} mm — shaft ei`,
    result.shaft.ei_um,
    entry.shaft_ei_um,
    entry.source,
  );
  check(
    `${entry.hole_code}/${entry.shaft_code} @ ${entry.nominal_mm} mm — shaft es`,
    result.shaft.es_um,
    entry.shaft_es_um,
    entry.source,
  );
  checks++;
  if (result.fit.type !== entry.fit_type) {
    console.error(
      `FAIL  ${entry.hole_code}/${entry.shaft_code} fit_type: computed=${result.fit.type}, expected=${entry.fit_type}`,
    );
    failures++;
  } else {
    console.log(`  ok  ${entry.hole_code}/${entry.shaft_code} fit_type = ${result.fit.type}`);
  }
  check(
    `${entry.hole_code}/${entry.shaft_code} clearance_min`,
    result.fit.min_clearance_um,
    entry.clearance_min_um,
    entry.source,
  );
  check(
    `${entry.hole_code}/${entry.shaft_code} clearance_max`,
    result.fit.max_clearance_um,
    entry.clearance_max_um,
    entry.source,
  );
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${checks} checks, ${failures} failures`);
if (failures > 0) {
  console.error(`\nCROSS-CHECK FAILED: ${failures} fixture values diverge from engine.`);
  Deno.exit(1);
} else {
  console.log("\nCROSS-CHECK PASSED: engine matches all ISO 286-1 table values.");
}
