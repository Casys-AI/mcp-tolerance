import { FIT_COMPONENT_REGISTRY } from "./fit-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isFitViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    view: "fit",
    registry: FIT_COMPONENT_REGISTRY,
    validate: isFitViewerData,
    loadingLabel: "Receiving an ISO 286-1 fit result…",
    emptyLabel: "No ISO 286-1 fit result was received.",
  })
);
