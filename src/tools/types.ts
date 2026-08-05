/**
 * Tolerance tool contracts.
 *
 * @module lib/tolerance/tools/types
 */

import type { MCPTool, MCPToolMeta } from "@casys/mcp-server";

export type ToleranceToolCategory = "fit" | "stack";

export type ToleranceToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

/** Tolerance tool definition with handler. */
export interface ToleranceTool {
  name: string;
  description: string;
  category: ToleranceToolCategory;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  annotations?: MCPTool["annotations"];
  handler: ToleranceToolHandler;
  _meta?: MCPToolMeta;
}
