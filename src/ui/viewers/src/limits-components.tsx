/** @jsxImportSource preact */

import {
  defineComponentRegistry,
  defineComponentSurface,
} from "@casys/mcp-view-components";
import {
  definePreactComponent,
  type PreactSurfaceComponentProps,
  type PreactSurfaceContext,
} from "@casys/mcp-view-components/preact";
import {
  ElementBody,
  ElementIdent,
  ElementProvenance,
  ElementReading,
  KeyValueList,
  SemanticElement,
  Stack,
} from "@casys/mcp-view-components/preact/components";
import {
  factLabel,
  limitsIdentDetail,
  readingLabel,
  toleranceMessages,
} from "./i18n.ts";
import {
  type LimitsViewerData,
  presentLimitsViewer,
  presentNotChecked,
} from "./model.ts";
import { ScopeNotes } from "./scope-notes.tsx";

export const LIMITS_COMPONENT = "tolerance.limits-result";
export const LIMITS_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: LIMITS_COMPONENT }],
} as const;

type LimitsProps = PreactSurfaceComponentProps<LimitsViewerData>;

const LimitsResult = ({ data, context }: LimitsProps) => {
  const locale = context.hostContext?.locale;
  const t = toleranceMessages(locale);
  const view = presentLimitsViewer(data, locale);
  const notes = presentNotChecked(data.not_checked);
  const kind = "designation" in data ? "iso286-limits" : "iso286-it";
  const readings = [
    ...(view.badge
      ? [{
        id: "classification",
        label: readingLabel(t, "classification", "limits"),
        value: view.badge.label,
        unit: "",
      }]
      : []),
    ...view.metrics.map((reading) => ({
      ...reading,
      label: readingLabel(t, reading.id, "limits"),
    })),
  ];
  const facts = view.facts.map((fact) => ({
    ...fact,
    label: factLabel(t, fact, data),
  }));
  return (
    <SemanticElement
      reference={{
        domain: "tolerance",
        kind,
        id: `${view.title}@${data.nominal_diameter_mm}mm`,
      }}
      density="card"
      ident={<ElementIdent label={view.title} detail={limitsIdentDetail(t, data)} />}
      reading={readings.map((reading) => (
        <ElementReading
          key={reading.id}
          label={reading.label}
          value={reading.value}
          unit={reading.unit || undefined}
        />
      ))}
      body={facts.length > 0 || notes.items.length > 0
        ? (
          <ElementBody>
            <Stack gap="sm">
              {facts.length > 0 ? <KeyValueList items={facts} /> : null}
              <ScopeNotes notes={notes} t={t} locale={locale} />
            </Stack>
          </ElementBody>
        )
        : undefined}
      provenance={<ElementProvenance label={t("provenance")} value={view.provenance} />}
    />
  );
};

export const LIMITS_COMPONENT_REGISTRY = defineComponentRegistry<
  LimitsViewerData,
  PreactSurfaceContext<LimitsViewerData>
>({
  components: {
    [LIMITS_COMPONENT]: definePreactComponent(
      {
        title: "ISO 286-1 tolerance result",
        description:
          "One designation or IT result with recorded readings, scope, and provenance.",
      },
      LimitsResult,
    ),
  },
  defaultSurface: defineComponentSurface(LIMITS_DEFAULT_SURFACE),
});
