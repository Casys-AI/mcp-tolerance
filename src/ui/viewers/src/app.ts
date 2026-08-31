import { startPreactSurfaceApp } from "@casys/mcp-view-components/preact";
import type { ViewComponentRegistry } from "@casys/mcp-view-components";
import type { ResultData } from "@casys/mcp-view";
import type { PreactSurfaceContext } from "@casys/mcp-view-components/preact";
import { StateMessage } from "@casys/mcp-view-components/preact/components";
import { createElement, render } from "preact";

export interface StartToleranceViewerOptions<TData> {
  readonly root: HTMLElement;
  readonly info: { readonly name: string; readonly version: string };
  readonly registry: ViewComponentRegistry<TData, PreactSurfaceContext<TData>>;
  readonly validate: (value: unknown) => value is TData;
  readonly loadingLabel: string;
  readonly emptyLabel: string;
}

export async function startToleranceViewer<TData>(
  options: StartToleranceViewerOptions<TData>,
): Promise<void> {
  await startPreactSurfaceApp({
    root: options.root,
    info: options.info,
    registry: options.registry as ViewComponentRegistry<
      ResultData,
      PreactSurfaceContext<ResultData>
    >,
    validate: options.validate as (value: unknown) => value is ResultData,
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
