import { STACKUP_COMPONENT_REGISTRY } from "./stackup-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isStackupViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    view: "stackup",
    registry: STACKUP_COMPONENT_REGISTRY,
    validate: isStackupViewerData,
  })
);
