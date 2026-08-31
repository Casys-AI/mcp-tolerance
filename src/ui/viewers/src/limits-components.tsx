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
  Message,
  SemanticElement,
  Stack,
} from "@casys/mcp-view-components/preact/components";
import {
  type LimitsViewerData,
  presentLimitsViewer,
  presentNotChecked,
} from "./model.ts";

export const LIMITS_COMPONENT = "tolerance.limits-result";
export const LIMITS_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: LIMITS_COMPONENT }],
} as const;

type LimitsProps = PreactSurfaceComponentProps<LimitsViewerData>;

const LimitsResult = ({ data }: LimitsProps) => {
  const view = presentLimitsViewer(data);
  const notes = presentNotChecked(data.not_checked);
  const kind = "designation" in data ? "iso286-limits" : "iso286-it";
  const readings = [
    ...(view.badge
      ? [{ id: "classification", label: "Type", value: view.badge.label, unit: "" }]
      : []),
    ...view.metrics,
  ];
  return (
    <SemanticElement
      reference={{
        domain: "tolerance",
        kind,
        id: `${view.title}@${data.nominal_diameter_mm}mm`,
      }}
      density="card"
      ident={<ElementIdent label={view.title} detail={view.eyebrow} />}
      reading={readings.map((reading) => (
        <ElementReading
          key={reading.id}
          label={reading.label}
          value={reading.value}
          unit={reading.unit || undefined}
        />
      ))}
      body={view.facts.length > 0 || notes.items.length > 0
        ? (
          <ElementBody>
            <Stack gap="sm">
              {view.facts.length > 0 ? <KeyValueList items={view.facts} /> : null}
              {notes.items.length > 0
                ? (
                  <div aria-label="Not checked" class="tolerance-scope-notes">
                    <strong>Not checked</strong>
                    {notes.items.map((note, index) => (
                      <Message key={`note-${index}`} tone="neutral">{note}</Message>
                    ))}
                    {notes.omittedLabel
                      ? <Message tone="neutral">{notes.omittedLabel}</Message>
                      : null}
                  </div>
                )
                : null}
            </Stack>
          </ElementBody>
        )
        : undefined}
      provenance={<ElementProvenance label="Provenance" value={view.provenance} />}
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
