import { FIT_COMPONENT_REGISTRY } from "./fit-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isFitViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    view: "fit",
    registry: FIT_COMPONENT_REGISTRY,
    validate: isFitViewerData,
  })
);
