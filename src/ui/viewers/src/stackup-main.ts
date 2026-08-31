import { STACKUP_APP_INFO } from "./stackup-catalog.ts";
import { STACKUP_COMPONENT_REGISTRY } from "./stackup-components.tsx";
import { bootToleranceViewer, startToleranceViewer } from "./app.ts";
import { isStackupViewerData } from "./model.ts";

bootToleranceViewer((root) =>
  startToleranceViewer({
    root,
    info: STACKUP_APP_INFO,
    registry: STACKUP_COMPONENT_REGISTRY,
    validate: isStackupViewerData,
    loadingLabel: "Receiving a 1D stack-up result…",
    emptyLabel: "No 1D stack-up result was received.",
  })
);
