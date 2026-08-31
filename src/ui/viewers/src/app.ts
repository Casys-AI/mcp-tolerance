import { startPreactSurfaceApp } from "@casys/mcp-view-components/preact";
import type { ViewComponentRegistry } from "@casys/mcp-view-components";
import type { ResultData } from "@casys/mcp-view";
import type { PreactSurfaceContext } from "@casys/mcp-view-components/preact";
import { StateMessage } from "@casys/mcp-view-components/preact/components";
import { createElement, render } from "preact";
import {
  TOLERANCE_VIEW_APP_MANIFEST,
  type ToleranceViewKey,
} from "../../app-manifest.ts";
import {
  isToleranceRecordedViewSession,
  parseToleranceRecordedViewSession,
  type ToleranceRecordedViewSession,
} from "./recorded-session.ts";

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
  await startPreactSurfaceApp<
    ResultData,
    ToleranceRecordedViewSession<TData>
  >({
    root: options.root,
    info: {
      name: TOLERANCE_VIEW_APP_MANIFEST.app.id,
      version: TOLERANCE_VIEW_APP_MANIFEST.app.version,
    },
    registry: options.registry as ViewComponentRegistry<
      ResultData,
      PreactSurfaceContext<ResultData>
    >,
    validate: options.validate as (value: unknown) => value is ResultData,
    validateSession: (value): value is ToleranceRecordedViewSession<TData> =>
      isToleranceRecordedViewSession(options.view, value, options.validate),
    mapSessionToData: async (session) => {
      const parsed = await parseToleranceRecordedViewSession(
        options.view,
        session,
        options.validate,
      );
      if (!parsed) {
        throw new TypeError(`Recorded ${options.view} projection rejected.`);
      }
      return parsed.structuredContent as ResultData;
    },
    loadingLabel: options.loadingLabel,
    emptyLabel: options.emptyLabel,
    surfaceClassName: "tolerance-component-surface",
  });
  options.root.removeAttribute("aria-busy");
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
