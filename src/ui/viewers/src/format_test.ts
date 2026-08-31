import { assertEquals, assertThrows } from "@std/assert";
import {
  capList,
  CONTRIBUTOR_CAP,
  formatNumber,
  formatSignedNumber,
  NOT_CHECKED_CAP,
  omittedLabel,
  UNIT_MM,
  UNIT_MM2,
  UNIT_UM,
} from "./format.ts";

Deno.test("formatNumber is locale-independent and trims trailing zeros", () => {
  assertEquals(formatNumber(0), "0");
  assertEquals(formatNumber(-0), "0");
  assertEquals(formatNumber(21), "21");
  assertEquals(formatNumber(-7), "-7");
  assertEquals(formatNumber(1.05), "1.05");
  assertEquals(formatNumber(15.1), "15.1");
  assertEquals(formatNumber(0.000001), "0.000001");
  assertEquals(formatNumber(1.230000), "1.23");
});

Deno.test("formatNumber rejects non-finite values instead of inventing text", () => {
  assertThrows(() => formatNumber(Number.NaN), TypeError, "finite number");
  assertThrows(
    () => formatNumber(Number.POSITIVE_INFINITY),
    TypeError,
    "finite number",
  );
});

Deno.test("formatSignedNumber keeps zero unsigned and prefixes positives", () => {
  assertEquals(formatSignedNumber(0), "0");
  assertEquals(formatSignedNumber(-0), "0");
  assertEquals(formatSignedNumber(21), "+21");
  assertEquals(formatSignedNumber(-20), "-20");
  assertEquals(formatSignedNumber(1.05), "+1.05");
});

Deno.test("exact contract units are the payload field units", () => {
  assertEquals(UNIT_MM, "mm");
  assertEquals(UNIT_UM, "µm");
  assertEquals(UNIT_MM2, "mm²");
});

Deno.test("capList preserves order and reports omitted items without inventing rows", () => {
  assertEquals(NOT_CHECKED_CAP, 3);
  assertEquals(CONTRIBUTOR_CAP, 8);
  const items = ["a", "b", "c", "d", "e"];
  assertEquals(capList(items, NOT_CHECKED_CAP), {
    items: ["a", "b", "c"],
    omitted: 2,
  });
  assertEquals(capList(["only"], NOT_CHECKED_CAP), {
    items: ["only"],
    omitted: 0,
  });
  assertEquals(
    omittedLabel(2, "not-checked items"),
    "2 more not-checked items omitted",
  );
  assertEquals(omittedLabel(0, "not-checked items"), undefined);
  assertEquals(omittedLabel(1, "contributors"), "1 more contributor omitted");
});
