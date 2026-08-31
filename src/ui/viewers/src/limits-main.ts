import { LIMITS_COMPONENT_REGISTRY } from "./limits-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isLimitsViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    view: "limits",
    registry: LIMITS_COMPONENT_REGISTRY,
    validate: isLimitsViewerData,
    loadingLabel: "Receiving an ISO 286-1 limits result…",
    emptyLabel: "No ISO 286-1 limits result was received.",
  })
);
