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
  DataTable,
  ElementBody,
  ElementIdent,
  ElementProvenance,
  ElementReading,
  Message,
  SemanticElement,
  Stack,
} from "@casys/mcp-view-components/preact/components";
import { UNIT_MM, UNIT_MM2 } from "./format.ts";
import {
  presentNotChecked,
  presentStackup,
  presentStackupContributors,
  type StackupResult,
} from "./model.ts";

export const STACKUP_COMPONENT = "tolerance.stackup-result";
export const STACKUP_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: STACKUP_COMPONENT }],
} as const;

type StackupProps = PreactSurfaceComponentProps<StackupResult>;

const StackupResultView = ({ data }: StackupProps) => {
  const view = presentStackup(data);
  const table = presentStackupContributors(data);
  const notes = presentNotChecked(data.not_checked);
  return (
    <SemanticElement
      reference={{ domain: "tolerance", kind: "stackup-1d", id: "result" }}
      density="card"
      ident={<ElementIdent label={view.title} detail={view.eyebrow} />}
      reading={view.metrics.map((reading) => (
        <ElementReading
          key={reading.id}
          label={reading.label}
          value={reading.value}
          unit={reading.unit}
        />
      ))}
      body={
        <ElementBody>
          <Stack gap="sm">
            <DataTable
              label="Stack-up contributors"
              rows={table.rows}
              rowKey={(row) => row.id}
              columns={[
                { id: "name", label: "Name", render: (row) => row.name },
                {
                  id: "signed_nominal_mm",
                  label: `Signed nominal (${UNIT_MM})`,
                  align: "right",
                  render: (row) => row.signed_nominal_mm,
                },
                {
                  id: "worst_case_upper_excursion_mm",
                  label: `WC upper (${UNIT_MM})`,
                  align: "right",
                  render: (row) => row.worst_case_upper_excursion_mm,
                },
                {
                  id: "worst_case_lower_excursion_mm",
                  label: `WC lower (${UNIT_MM})`,
                  align: "right",
                  render: (row) => row.worst_case_lower_excursion_mm,
                },
                {
                  id: "rss_upper_sq_mm2",
                  label: `RSS upper (${UNIT_MM2})`,
                  align: "right",
                  render: (row) => row.rss_upper_sq_mm2,
                },
                {
                  id: "rss_lower_sq_mm2",
                  label: `RSS lower (${UNIT_MM2})`,
                  align: "right",
                  render: (row) => row.rss_lower_sq_mm2,
                },
              ]}
            />
            {table.omittedLabel
              ? <Message tone="neutral">{table.omittedLabel}</Message>
              : null}
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

export const STACKUP_COMPONENT_REGISTRY = defineComponentRegistry<
  StackupResult,
  PreactSurfaceContext<StackupResult>
>({
  components: {
    [STACKUP_COMPONENT]: definePreactComponent(
      {
        title: "1D stack-up result",
        description:
          "One recorded stack-up with aggregate readings, contributors, scope, and provenance.",
      },
      StackupResultView,
    ),
  },
  defaultSurface: defineComponentSurface(STACKUP_DEFAULT_SURFACE),
});
