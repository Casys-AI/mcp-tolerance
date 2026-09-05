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
  omittedContributorsLabel,
  readingLabel,
  stackupIdentDetail,
  toleranceMessages,
} from "./i18n.ts";
import {
  presentNotChecked,
  presentStackup,
  presentStackupContributors,
  type StackupResult,
} from "./model.ts";
import { ScopeNotes } from "./scope-notes.tsx";

export const STACKUP_COMPONENT = "tolerance.stackup-result";
export const STACKUP_DEFAULT_SURFACE = {
  layout: { type: "stack", gap: "sm" },
  components: [{ id: "result", component: STACKUP_COMPONENT }],
} as const;

type StackupProps = PreactSurfaceComponentProps<StackupResult>;

const StackupResultView = ({ data, context }: StackupProps) => {
  const locale = context.hostContext?.locale;
  const t = toleranceMessages(locale);
  const view = presentStackup(data, locale);
  const table = presentStackupContributors(data, locale);
  const notes = presentNotChecked(data.not_checked);
  const omitted = omittedContributorsLabel(t, table.omitted, locale);
  return (
    <SemanticElement
      reference={{ domain: "tolerance", kind: "stackup-1d", id: "result" }}
      density="card"
      ident={
        <ElementIdent
          label={t("stackupTitle")}
          detail={stackupIdentDetail(t, data.contributor_count, locale)}
        />
      }
      reading={view.metrics.map((reading) => (
        <ElementReading
          key={reading.id}
          label={readingLabel(t, reading.id, "stackup")}
          value={reading.value}
          unit={reading.unit}
        />
      ))}
      body={
        <ElementBody>
          <Stack gap="sm">
            <DataTable
              label={t("contributorsTable")}
              rows={table.rows}
              rowKey={(row) => row.id}
              columns={[
                { id: "name", label: t("name"), render: (row) => row.name },
                {
                  id: "signed_nominal_mm",
                  label: t("signedNominal", { unit: UNIT_MM }),
                  align: "right",
                  render: (row) => row.signed_nominal_mm,
                },
                {
                  id: "worst_case_upper_excursion_mm",
                  label: t("wcUpper", { unit: UNIT_MM }),
                  align: "right",
                  render: (row) => row.worst_case_upper_excursion_mm,
                },
                {
                  id: "worst_case_lower_excursion_mm",
                  label: t("wcLower", { unit: UNIT_MM }),
                  align: "right",
                  render: (row) => row.worst_case_lower_excursion_mm,
                },
                {
                  id: "rss_upper_sq_mm2",
                  label: t("rssUpper", { unit: UNIT_MM2 }),
                  align: "right",
                  render: (row) => row.rss_upper_sq_mm2,
                },
                {
                  id: "rss_lower_sq_mm2",
                  label: t("rssLower", { unit: UNIT_MM2 }),
                  align: "right",
                  render: (row) => row.rss_lower_sq_mm2,
                },
              ]}
            />
            {omitted ? <Message tone="neutral">{omitted}</Message> : null}
            <ScopeNotes notes={notes} t={t} locale={locale} />
          </Stack>
        </ElementBody>
      }
      provenance={<ElementProvenance label={t("provenance")} value={view.provenance} />}
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
