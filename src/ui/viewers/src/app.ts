import {
  type PreactSurfaceAppOptions,
  startPreactSurfaceApp,
  type SurfaceLabel,
} from "@casys/mcp-view-components/preact";
import type { ViewComponentRegistry } from "@casys/mcp-view-components";
import type { PreactSurfaceContext } from "@casys/mcp-view-components/preact";
import { StateMessage } from "@casys/mcp-view-components/preact/components";
import { createElement, render } from "preact";
import {
  TOLERANCE_VIEW_APP_MANIFEST,
  type ToleranceViewKey,
} from "../../app-manifest.ts";
import {
  toleranceEmptyLabel,
  toleranceLoadingLabel,
  toleranceMessages,
} from "./i18n.ts";
import { parseToleranceRecordedViewSession } from "./recorded-session.ts";

export const SESSION_REJECTED_CODE = "session-rejected";

export interface StartToleranceViewerOptions<TData> {
  readonly root: HTMLElement;
  readonly view: ToleranceViewKey;
  readonly registry: ViewComponentRegistry<TData, PreactSurfaceContext<TData>>;
  readonly validate: (value: unknown) => value is TData;
}

export async function startToleranceViewer<TData>(
  options: StartToleranceViewerOptions<TData>,
): Promise<void> {
  await startPreactSurfaceApp(toleranceSurfaceAppOptions(options));
}

/** Project the same domain data through the kit's tool-result and session lifecycle. */
export function toleranceSurfaceAppOptions<TData>(
  options: StartToleranceViewerOptions<TData>,
): PreactSurfaceAppOptions<TData, unknown> {
  return {
    root: options.root,
    info: {
      name: TOLERANCE_VIEW_APP_MANIFEST.app.id,
      version: TOLERANCE_VIEW_APP_MANIFEST.app.version,
    },
    registry: options.registry,
    validate: options.validate,
    viewerSession: {
      // All session actions reach the strict parser, including malformed input.
      validate: (_value: unknown): _value is unknown => true,
      toState: async (value) => {
        const parsed = await parseToleranceRecordedViewSession(
          options.view,
          value,
          options.validate,
        );
        if (!parsed) {
          return {
            kind: "error",
            title: sessionRejectedTitle,
            code: SESSION_REJECTED_CODE,
            message: sessionRejectedMessage(options.view),
          };
        }
        return { kind: "result", result: parsed.structuredContent };
      },
    },
    loadingLabel: toleranceLoadingLabel(options.view),
    emptyLabel: toleranceEmptyLabel(options.view),
    documentLanguage: toleranceMessages.locale,
    themeUpdates: "in-place",
    surfaceClassName: "tolerance-component-surface",
  };
}

const sessionRejectedTitle: SurfaceLabel = (locale) =>
  toleranceMessages(locale)("sessionRejected");

function sessionRejectedMessage(view: ToleranceViewKey): SurfaceLabel {
  return (locale) => toleranceMessages(locale)("sessionRejectedMessage", { view });
}

export function bootToleranceViewer(
  start: (root: HTMLElement) => Promise<void>,
): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("The tolerance viewer root is missing.");
  void start(root).catch((error) => {
    const t = toleranceMessages();
    const detail = error instanceof Error ? error.message : t("viewerStartFailed");
    render(
      createElement(
        StateMessage,
        { title: t("viewerUnavailable"), tone: "danger" },
        detail,
      ),
      root,
    );
    root.removeAttribute("aria-busy");
    console.error(error);
  });
}
