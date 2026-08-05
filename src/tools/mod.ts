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

import { fitTools } from "./tolerance.ts";
import type { ToleranceTool } from "./types.ts";

/** All tolerance tools combined. */
export const allTools: ToleranceTool[] = [...fitTools];

/** Tools organised by category. */
export const toolsByCategory: Record<string, ToleranceTool[]> = {
  fit: fitTools,
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
