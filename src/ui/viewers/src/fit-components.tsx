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
import { factLabel, readingLabel, toleranceMessages } from "./i18n.ts";
import {
  type FitViewerData,
  presentFitMembers,
  presentFitViewer,
  presentNotChecked,
} from "./model.ts";
import { ScopeNotes } from "./scope-notes.tsx";

export const FIT_COMPONENT = "tolerance.fit-result";
export const FIT_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: FIT_COMPONENT }],
} as const;

type FitProps = PreactSurfaceComponentProps<FitViewerData>;

const FitResult = ({ data, context }: FitProps) => {
  const locale = context.hostContext?.locale;
  const t = toleranceMessages(locale);
  const view = presentFitViewer(data, locale);
  const notes = presentNotChecked(data.not_checked);
  const facts = [...view.facts, ...presentFitMembers(data, locale)].map(
    (fact) => ({ ...fact, label: factLabel(t, fact, data) }),
  );
  const readings = [
    ...(view.badge
      ? [{
        id: "classification",
        label: readingLabel(t, "classification", "fit"),
        value: view.badge.label,
        unit: "",
      }]
      : []),
    ...view.metrics.map((reading) => ({
      ...reading,
      label: readingLabel(t, reading.id, "fit"),
    })),
  ];
  return (
    <SemanticElement
      reference={{
        domain: "tolerance",
        kind: "iso286-fit",
        id: `${view.title}@${data.nominal_diameter_mm}mm`,
      }}
      density="card"
      ident={<ElementIdent label={view.title} detail={t("iso286Fit")} />}
      reading={readings.map((reading) => (
        <ElementReading
          key={reading.id}
          label={reading.label}
          value={reading.value}
          unit={reading.unit || undefined}
        />
      ))}
      body={
        <ElementBody>
          <Stack gap="sm">
            <KeyValueList items={facts} />
            <ScopeNotes notes={notes} t={t} locale={locale} />
          </Stack>
        </ElementBody>
      }
      provenance={<ElementProvenance label={t("provenance")} value={view.provenance} />}
    />
  );
};

export const FIT_COMPONENT_REGISTRY = defineComponentRegistry<
  FitViewerData,
  PreactSurfaceContext<FitViewerData>
>({
  components: {
    [FIT_COMPONENT]: definePreactComponent(
      {
        title: "ISO 286-1 fit result",
        description:
          "One hole/shaft fit with classification, readings, scope, and provenance.",
      },
      FitResult,
    ),
  },
  defaultSurface: defineComponentSurface(FIT_DEFAULT_SURFACE),
});
