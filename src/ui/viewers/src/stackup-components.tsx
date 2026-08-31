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
import { Card, DataTable, Message } from "@casys/mcp-view-components/preact/components";
import { STACKUP_COMPONENTS, STACKUP_DEFAULT_SURFACE } from "./stackup-catalog.ts";
import { UNIT_MM, UNIT_MM2 } from "./format.ts";
import {
  presentStackup,
  presentStackupContributors,
  type StackupResult,
} from "./model.ts";
import { NotCheckedCard, ResultCard } from "./result-card.tsx";

type StackupProps = PreactSurfaceComponentProps<StackupResult>;

const StackupResultCard = ({ data }: StackupProps) => (
  <ResultCard view={presentStackup(data)} />
);

const StackupContributors = ({ data }: StackupProps) => {
  const table = presentStackupContributors(data);
  return (
    <Card title="Contributors" eyebrow="Signed nominal and excursion terms">
      <DataTable
        label="Stack-up contributors"
        rows={table.rows}
        rowKey={(row) => row.id}
        columns={[
          {
            id: "name",
            label: "Name",
            render: (row) => row.name,
          },
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
    </Card>
  );
};

const StackupNotChecked = ({ data }: StackupProps) => (
  <NotCheckedCard notes={data.not_checked} />
);

export const STACKUP_COMPONENT_REGISTRY = defineComponentRegistry<
  StackupResult,
  PreactSurfaceContext<StackupResult>
>({
  components: {
    [STACKUP_COMPONENTS.result]: definePreactComponent(
      {
        title: "1D stack-up",
        description: "Worst-case and RSS assembly bounds from the contributor chain.",
      },
      StackupResultCard,
    ),
    [STACKUP_COMPONENTS.contributors]: definePreactComponent(
      {
        title: "Contributors",
        description: "Capped contributor table of signed nominal and excursion terms.",
      },
      StackupContributors,
    ),
    [STACKUP_COMPONENTS.notChecked]: definePreactComponent(
      {
        title: "Not checked",
        description: "Capped scope notes copied from the tool result.",
      },
      StackupNotChecked,
    ),
  },
  defaultSurface: defineComponentSurface(STACKUP_DEFAULT_SURFACE),
});
