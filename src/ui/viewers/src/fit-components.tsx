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
  type FitViewerData,
  presentFitMembers,
  presentFitViewer,
  presentNotChecked,
} from "./model.ts";

export const FIT_COMPONENT = "tolerance.fit-result";
export const FIT_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: FIT_COMPONENT }],
} as const;

type FitProps = PreactSurfaceComponentProps<FitViewerData>;

const FitResult = ({ data }: FitProps) => {
  const view = presentFitViewer(data);
  const notes = presentNotChecked(data.not_checked);
  const facts = [...view.facts, ...presentFitMembers(data)];
  const readings = [
    ...(view.badge
      ? [{ id: "classification", label: "Fit type", value: view.badge.label, unit: "" }]
      : []),
    ...view.metrics,
  ];
  return (
    <SemanticElement
      reference={{
        domain: "tolerance",
        kind: "iso286-fit",
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
      body={
        <ElementBody>
          <Stack gap="sm">
            <KeyValueList items={facts} />
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
      }
      provenance={<ElementProvenance label="Provenance" value={view.provenance} />}
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
