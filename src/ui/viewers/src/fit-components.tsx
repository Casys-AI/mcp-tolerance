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
import { Card, KeyValueList } from "@casys/mcp-view-components/preact/components";
import { FIT_COMPONENTS, FIT_DEFAULT_SURFACE } from "./fit-catalog.ts";
import { type FitViewerData, presentFitMembers, presentFitViewer } from "./model.ts";
import { NotCheckedCard, ResultCard } from "./result-card.tsx";

type FitProps = PreactSurfaceComponentProps<FitViewerData>;

const FitResult = ({ data }: FitProps) => <ResultCard view={presentFitViewer(data)} />;

const FitMembers = ({ data }: FitProps) => (
  <Card title="Hole and shaft" eyebrow="Computed ISO 286-1 members">
    <KeyValueList items={presentFitMembers(data)} />
  </Card>
);

const FitNotChecked = ({ data }: FitProps) => (
  <NotCheckedCard notes={data.not_checked} />
);

export const FIT_COMPONENT_REGISTRY = defineComponentRegistry<
  FitViewerData,
  PreactSurfaceContext<FitViewerData>
>({
  components: {
    [FIT_COMPONENTS.result]: definePreactComponent(
      {
        title: "ISO 286-1 fit",
        description:
          "Hole/shaft pair, factual fit classification, and clearance extremes.",
      },
      FitResult,
    ),
    [FIT_COMPONENTS.members]: definePreactComponent(
      {
        title: "Hole and shaft",
        description: "Computed hole and shaft deviation members.",
      },
      FitMembers,
    ),
    [FIT_COMPONENTS.notChecked]: definePreactComponent(
      {
        title: "Not checked",
        description: "Capped scope notes copied from the tool result.",
      },
      FitNotChecked,
    ),
  },
  defaultSurface: defineComponentSurface(FIT_DEFAULT_SURFACE),
});
