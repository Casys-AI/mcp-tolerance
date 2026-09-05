import { LIMITS_COMPONENT_REGISTRY } from "./limits-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isLimitsViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    view: "limits",
    registry: LIMITS_COMPONENT_REGISTRY,
    validate: isLimitsViewerData,
  })
);
