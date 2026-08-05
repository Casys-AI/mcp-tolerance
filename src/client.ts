/**
 * Tolerance Tools Client.
 *
 * Same pattern as the other Casys MCP servers.
 *
 * @module lib/tolerance/client
 */

import {
  allTools,
  getCategories,
  getToolByName,
  getToolsByCategory,
  toolsByCategory,
} from "./tools/mod.ts";
import type {
  ToleranceTool,
  ToleranceToolCategory,
  ToleranceToolHandler,
} from "./tools/mod.ts";
import type { MCPTool } from "@casys/mcp-server";

export { allTools, getCategories, getToolByName, getToolsByCategory, toolsByCategory };
export type { ToleranceTool, ToleranceToolCategory, ToleranceToolHandler };

export interface MCPToolWireFormat {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  annotations?: MCPTool["annotations"];
  _meta?: MCPTool["_meta"];
}

export interface ToleranceToolsClientOptions {
  categories?: string[];
}

export class ToleranceToolsClient {
  private tools: ToleranceTool[];

  constructor(options?: ToleranceToolsClientOptions) {
    this.tools = options?.categories
      ? options.categories.flatMap((cat) => getToolsByCategory(cat))
      : allTools;
  }

  listTools(): ToleranceTool[] {
    return this.tools;
  }

  get count(): number {
    return this.tools.length;
  }

  toMCPFormat(): MCPToolWireFormat[] {
    return this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema,
      annotations: t.annotations,
      _meta: t._meta,
    }));
  }

  buildHandlersMap(): Map<string, ToleranceToolHandler> {
    const handlers = new Map<string, ToleranceToolHandler>();
    for (const tool of this.tools) handlers.set(tool.name, tool.handler);
    return handlers;
  }
}
