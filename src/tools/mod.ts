/**
 * Tolerance tools — aggregated exports.
 *
 * @module lib/tolerance/tools/mod
 */

export type {
  ToleranceTool,
  ToleranceToolCategory,
  ToleranceToolHandler,
} from "./types.ts";
export { fitTools } from "./tolerance.ts";
export { toleranceLimitsTool } from "./limits.ts";
export { toleranceFitAnalyzeTool } from "./fit_analyze.ts";
export { toleranceStackupTool } from "./stackup.ts";

import { fitTools } from "./tolerance.ts";
import { toleranceLimitsTool } from "./limits.ts";
import { toleranceFitAnalyzeTool } from "./fit_analyze.ts";
import { toleranceStackupTool } from "./stackup.ts";
import type { ToleranceTool } from "./types.ts";

/** All tolerance tools combined. */
export const allTools: ToleranceTool[] = [
  ...fitTools,
  toleranceLimitsTool,
  toleranceFitAnalyzeTool,
  toleranceStackupTool,
];

/** Tools organised by category. */
export const toolsByCategory: Record<string, ToleranceTool[]> = {
  fit: [...fitTools, toleranceLimitsTool, toleranceFitAnalyzeTool],
  stack: [toleranceStackupTool],
};

export function getToolsByCategory(category: string): ToleranceTool[] {
  return toolsByCategory[category] ?? [];
}

export function getToolByName(name: string): ToleranceTool | undefined {
  return allTools.find((t) => t.name === name);
}

export function getCategories(): string[] {
  return Object.keys(toolsByCategory);
}
