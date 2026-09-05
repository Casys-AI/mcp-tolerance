import {
  type PreactSurfaceAppOptions,
  startPreactSurfaceApp,
} from "@casys/mcp-view-components/preact";
import type { ViewComponentRegistry } from "@casys/mcp-view-components";
import type { PreactSurfaceContext } from "@casys/mcp-view-components/preact";
import { StateMessage } from "@casys/mcp-view-components/preact/components";
import { createElement, render } from "preact";
import {
  TOLERANCE_VIEW_APP_MANIFEST,
  type ToleranceViewKey,
} from "../../app-manifest.ts";
import { parseToleranceRecordedViewSession } from "./recorded-session.ts";

export interface StartToleranceViewerOptions<TData> {
  readonly root: HTMLElement;
  readonly view: ToleranceViewKey;
  readonly registry: ViewComponentRegistry<TData, PreactSurfaceContext<TData>>;
  readonly validate: (value: unknown) => value is TData;
  readonly loadingLabel: string;
  readonly emptyLabel: string;
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
            title: "Session rejected",
            code: "session-rejected",
            message: `Recorded ${options.view} projection rejected.`,
          };
        }
        return { kind: "result", result: parsed.structuredContent };
      },
    },
    loadingLabel: options.loadingLabel,
    emptyLabel: options.emptyLabel,
    surfaceClassName: "tolerance-component-surface",
  };
}

export function bootToleranceViewer(
  start: (root: HTMLElement) => Promise<void>,
): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("The tolerance viewer root is missing.");
  void start(root).catch((error) => {
    const detail = error instanceof Error
      ? error.message
      : "The viewer could not start.";
    render(
      createElement(
        StateMessage,
        { title: "Tolerance viewer unavailable", tone: "danger" },
        detail,
      ),
      root,
    );
    root.removeAttribute("aria-busy");
    console.error(error);
  });
}
