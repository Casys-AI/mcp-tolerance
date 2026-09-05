import { createTranslator } from "@casys/mcp-view-components";
import type { ToleranceViewKey } from "../../app-manifest.ts";
import { formatNumber } from "./format.ts";
import type { FactView, FitViewerData, LimitsViewerData } from "./model.ts";

/** Interface wording only. Domain states, codes, ids and source strings stay as recorded. */
export const TOLERANCE_MESSAGES_EN = {
  loadingLimits: "Receiving an ISO 286-1 limits result…",
  emptyLimits: "No ISO 286-1 limits result was received.",
  loadingFit: "Receiving an ISO 286-1 fit result…",
  emptyFit: "No ISO 286-1 fit result was received.",
  loadingStackup: "Receiving a 1D stack-up result…",
  emptyStackup: "No 1D stack-up result was received.",
  sessionRejected: "Session rejected",
  sessionRejectedMessage: "Recorded {view} projection rejected.",
  viewerUnavailable: "Tolerance viewer unavailable",
  viewerStartFailed: "The viewer could not start.",
  provenance: "Provenance",
  notChecked: "Not checked",
  type: "Type",
  fitType: "Fit type",
  nominal: "Nominal",
  lowerDeviation: "Lower deviation",
  upperDeviation: "Upper deviation",
  it: "IT",
  diameterRange: "Diameter range",
  itGrade: "IT grade",
  fundamentalDeviation: "Fundamental deviation",
  minClearance: "Minimum clearance",
  maxClearance: "Maximum clearance",
  minInterference: "Minimum interference",
  maxInterference: "Maximum interference",
  holeMember: "Hole {designation}",
  shaftMember: "Shaft {designation}",
  iso286Hole: "ISO 286-1 hole",
  iso286Shaft: "ISO 286-1 shaft",
  iso286Fundamental: "ISO 286-1 fundamental tolerance",
  iso286Fit: "ISO 286-1 hole/shaft fit",
  stackupTitle: "1D stack-up",
  contributorCount: "{count} contributors",
  contributorCountOne: "1 contributor",
  worstCaseMin: "Worst-case min",
  worstCaseMax: "Worst-case max",
  rssMin: "RSS min",
  rssMax: "RSS max",
  contributorsTable: "Stack-up contributors",
  name: "Name",
  signedNominal: "Signed nominal ({unit})",
  wcUpper: "WC upper ({unit})",
  wcLower: "WC lower ({unit})",
  rssUpper: "RSS upper ({unit})",
  rssLower: "RSS lower ({unit})",
  omittedContributorsOne: "1 more contributor omitted",
  omittedContributorsMany: "{count} more contributors omitted",
  omittedNotCheckedOne: "1 more not-checked item omitted",
  omittedNotCheckedMany: "{count} more not-checked items omitted",
} as const;

export type ToleranceMessageKey = keyof typeof TOLERANCE_MESSAGES_EN;

export const TOLERANCE_MESSAGES_FR: {
  readonly [Key in ToleranceMessageKey]: string;
} = {
  loadingLimits: "Réception d’un résultat de limites ISO 286-1…",
  emptyLimits: "Aucun résultat de limites ISO 286-1 n’a été reçu.",
  loadingFit: "Réception d’un résultat d’ajustement ISO 286-1…",
  emptyFit: "Aucun résultat d’ajustement ISO 286-1 n’a été reçu.",
  loadingStackup: "Réception d’un résultat d’empilage 1D…",
  emptyStackup: "Aucun résultat d’empilage 1D n’a été reçu.",
  sessionRejected: "Session rejetée",
  sessionRejectedMessage: "Projection enregistrée {view} rejetée.",
  viewerUnavailable: "Visionneuse de tolérances indisponible",
  viewerStartFailed: "La visionneuse n’a pas pu démarrer.",
  provenance: "Provenance",
  notChecked: "Non vérifié",
  type: "Type",
  fitType: "Type d’ajustement",
  nominal: "Nominal",
  lowerDeviation: "Écart inférieur",
  upperDeviation: "Écart supérieur",
  it: "IT",
  diameterRange: "Intervalle de diamètres",
  itGrade: "Degré IT",
  fundamentalDeviation: "Écart fondamental",
  minClearance: "Jeu minimum",
  maxClearance: "Jeu maximum",
  minInterference: "Serrage minimum",
  maxInterference: "Serrage maximum",
  holeMember: "Alésage {designation}",
  shaftMember: "Arbre {designation}",
  iso286Hole: "Alésage ISO 286-1",
  iso286Shaft: "Arbre ISO 286-1",
  iso286Fundamental: "Tolérance fondamentale ISO 286-1",
  iso286Fit: "Ajustement alésage/arbre ISO 286-1",
  stackupTitle: "Empilage 1D",
  contributorCount: "{count} contributeurs",
  contributorCountOne: "1 contributeur",
  worstCaseMin: "Min. au pire cas",
  worstCaseMax: "Max. au pire cas",
  rssMin: "Min. RSS",
  rssMax: "Max. RSS",
  contributorsTable: "Contributeurs de l’empilage",
  name: "Nom",
  signedNominal: "Nominal signé ({unit})",
  wcUpper: "WC sup. ({unit})",
  wcLower: "WC inf. ({unit})",
  rssUpper: "RSS sup. ({unit})",
  rssLower: "RSS inf. ({unit})",
  omittedContributorsOne: "1 autre contributeur omis",
  omittedContributorsMany: "{count} autres contributeurs omis",
  omittedNotCheckedOne: "1 autre élément non vérifié omis",
  omittedNotCheckedMany: "{count} autres éléments non vérifiés omis",
};

export const toleranceMessages = createTranslator({
  defaultLocale: "en",
  messages: TOLERANCE_MESSAGES_EN,
  translations: { fr: TOLERANCE_MESSAGES_FR },
});

export type ToleranceLabels = ReturnType<typeof toleranceMessages>;

const LOADING_KEYS = {
  limits: "loadingLimits",
  fit: "loadingFit",
  stackup: "loadingStackup",
} as const satisfies Record<ToleranceViewKey, ToleranceMessageKey>;

const EMPTY_KEYS = {
  limits: "emptyLimits",
  fit: "emptyFit",
  stackup: "emptyStackup",
} as const satisfies Record<ToleranceViewKey, ToleranceMessageKey>;

const READING_KEYS = {
  nominal: "nominal",
  lower: "lowerDeviation",
  upper: "upperDeviation",
  it: "it",
  "min-clearance": "minClearance",
  "max-clearance": "maxClearance",
  "min-interference": "minInterference",
  "max-interference": "maxInterference",
  "wc-min": "worstCaseMin",
  "wc-max": "worstCaseMax",
  "rss-min": "rssMin",
  "rss-max": "rssMax",
} as const satisfies Record<string, ToleranceMessageKey>;

export function toleranceLoadingLabel(
  view: ToleranceViewKey,
): (locale?: string) => string {
  return (locale) => toleranceMessages(locale)(LOADING_KEYS[view]);
}

export function toleranceEmptyLabel(
  view: ToleranceViewKey,
): (locale?: string) => string {
  return (locale) => toleranceMessages(locale)(EMPTY_KEYS[view]);
}

export function readingLabel(
  t: ToleranceLabels,
  id: string,
  viewer: "limits" | "fit" | "stackup",
): string {
  if (id === "classification") return t(viewer === "fit" ? "fitType" : "type");
  const key = READING_KEYS[id as keyof typeof READING_KEYS];
  if (!key) throw new RangeError(`Unknown reading label: ${id}`);
  return t(key);
}

export function factLabel(
  t: ToleranceLabels,
  fact: FactView,
  data: LimitsViewerData | FitViewerData,
): string {
  switch (fact.id) {
    case "range":
      return t("diameterRange");
    case "grade":
      return t("itGrade");
    case "fundamental":
      return t("fundamentalDeviation");
    case "hole":
      return t("holeMember", {
        designation: "hole" in data ? data.hole.designation : "",
      });
    case "shaft":
      return t("shaftMember", {
        designation: "shaft" in data ? data.shaft.designation : "",
      });
    default:
      throw new RangeError(`Unknown fact label: ${fact.id}`);
  }
}

export function limitsIdentDetail(
  t: ToleranceLabels,
  data: LimitsViewerData,
): string {
  if (!("designation" in data)) return t("iso286Fundamental");
  return t(data.designation_type === "hole" ? "iso286Hole" : "iso286Shaft");
}

export function stackupIdentDetail(
  t: ToleranceLabels,
  count: number,
  locale?: string,
): string {
  if (count === 1) return t("contributorCountOne");
  return t("contributorCount", { count: formatNumber(count, locale) });
}

export function omittedContributorsLabel(
  t: ToleranceLabels,
  omitted: number,
  locale?: string,
): string | undefined {
  if (omitted === 0) return undefined;
  if (omitted === 1) return t("omittedContributorsOne");
  return t("omittedContributorsMany", { count: formatNumber(omitted, locale) });
}

export function omittedNotCheckedLabel(
  t: ToleranceLabels,
  omitted: number,
  locale?: string,
): string | undefined {
  if (omitted === 0) return undefined;
  if (omitted === 1) return t("omittedNotCheckedOne");
  return t("omittedNotCheckedMany", { count: formatNumber(omitted, locale) });
}
