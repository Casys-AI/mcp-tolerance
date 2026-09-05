import { assertEquals } from "@std/assert";
import {
  omittedNotCheckedLabel,
  readingLabel,
  toleranceEmptyLabel,
  toleranceLoadingLabel,
  toleranceMessages,
} from "./i18n.ts";

Deno.test("interface wording uses kit createTranslator, not a local i18n runtime", async () => {
  const source = await Deno.readTextFile(new URL("./i18n.ts", import.meta.url));
  assertEquals(source.includes('from "@casys/mcp-view-components"'), true);
  assertEquals(source.includes("createTranslator"), true);
});

Deno.test("interface dictionaries follow host locale and fall back to English", () => {
  assertEquals(
    toleranceMessages("en")("fitType"),
    "Fit type",
  );
  assertEquals(
    toleranceMessages("fr")("fitType"),
    "Type d’ajustement",
  );
  assertEquals(
    toleranceMessages("fr-CA")("loadingLimits"),
    "Réception d’un résultat de limites ISO 286-1…",
  );
  assertEquals(
    toleranceMessages("not a locale")("fitType"),
    "Fit type",
  );
  assertEquals(toleranceMessages()("nominal"), "Nominal");
  assertEquals(
    toleranceMessages("fr")("holeMember", { designation: "H7" }),
    "Alésage H7",
  );
  assertEquals(toleranceMessages.locale("en"), "en");
  assertEquals(toleranceMessages.locale("fr"), "fr");
  assertEquals(toleranceMessages.locale("fr-CA"), "fr");
  assertEquals(toleranceMessages.locale("not a locale"), "en");
  assertEquals(toleranceMessages.locale(), "en");
});

Deno.test("SurfaceLabel callbacks translate loading and empty without domain ids", () => {
  assertEquals(
    toleranceLoadingLabel("limits")("fr"),
    "Réception d’un résultat de limites ISO 286-1…",
  );
  assertEquals(
    toleranceEmptyLabel("fit")("en"),
    "No ISO 286-1 fit result was received.",
  );
  assertEquals(
    toleranceLoadingLabel("stackup")("not a locale"),
    "Receiving a 1D stack-up result…",
  );
  assertEquals(
    toleranceMessages("fr")("sessionRejectedMessage", { view: "limits" }),
    "Projection enregistrée limits rejetée.",
  );
});

Deno.test("boot failure before host connection stays English", async () => {
  const source = await Deno.readTextFile(new URL("./app.ts", import.meta.url));
  assertEquals(source.includes("const t = toleranceMessages();"), true);
  assertEquals(source.includes("documentLanguage: toleranceMessages.locale"), true);
  assertEquals(source.includes('from "@casys/mcp-view-components/preact"'), true);
  assertEquals(source.includes("type SurfaceLabel"), true);
});

Deno.test("reading labels stay keyed off ids and never translate domain states", () => {
  const fr = toleranceMessages("fr");
  assertEquals(readingLabel(fr, "classification", "fit"), "Type d’ajustement");
  assertEquals(readingLabel(fr, "classification", "limits"), "Type");
  assertEquals(readingLabel(fr, "min-clearance", "fit"), "Jeu minimum");
  assertEquals(
    omittedNotCheckedLabel(fr, 2),
    "2 autres éléments non vérifiés omis",
  );
  assertEquals(omittedNotCheckedLabel(fr, 0), undefined);
});
