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
import { LIMITS_COMPONENTS, LIMITS_DEFAULT_SURFACE } from "./limits-catalog.ts";
import { type LimitsViewerData, presentLimitsViewer } from "./model.ts";
import { NotCheckedCard, ResultCard } from "./result-card.tsx";

type LimitsProps = PreactSurfaceComponentProps<LimitsViewerData>;

const LimitsResult = ({ data }: LimitsProps) => (
  <ResultCard view={presentLimitsViewer(data)} />
);

const LimitsNotChecked = ({ data }: LimitsProps) => (
  <NotCheckedCard notes={data.not_checked} />
);

export const LIMITS_COMPONENT_REGISTRY = defineComponentRegistry<
  LimitsViewerData,
  PreactSurfaceContext<LimitsViewerData>
>({
  components: {
    [LIMITS_COMPONENTS.result]: definePreactComponent(
      {
        title: "ISO 286-1 limits",
        description:
          "One designation or IT grade with payload deviations and provenance.",
      },
      LimitsResult,
    ),
    [LIMITS_COMPONENTS.notChecked]: definePreactComponent(
      {
        title: "Not checked",
        description: "Capped scope notes copied from the tool result.",
      },
      LimitsNotChecked,
    ),
  },
  defaultSurface: defineComponentSurface(LIMITS_DEFAULT_SURFACE),
});
