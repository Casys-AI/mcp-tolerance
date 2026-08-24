/** Stateless HTTP MCP server for ISO 286-1 dimensional tolerance checks. */

import { McpApp } from "@casys/mcp-server";
import { ToleranceToolsClient } from "./src/client.ts";

const VERSION = "0.3.0";
const DEFAULT_PORT = 3019;
const DEFAULT_HOSTNAME = "127.0.0.1";

export interface CreateToleranceServerOptions {
  logger?: (message: string) => void;
}

export function createToleranceServer(
  options: CreateToleranceServerOptions = {},
): { app: McpApp } {
  const client = new ToleranceToolsClient();
  const handlers = client.buildHandlersMap();

  const app = new McpApp({
    name: "mcp-tolerance",
    version: VERSION,
    transport: "stateless",
    maxConcurrent: 4,
    backpressureStrategy: "queue",
    validateSchema: true,
    instructions: "ISO 286-1:2010 dimensional tolerance oracle. " +
      "Computes hole and shaft deviation limits (EI/ES, ei/es), fundamental " +
      "tolerance IT values, and fit type (clearance/transition/interference) " +
      "from the standard formulas and tables. It also computes linear 1D " +
      "dimension-chain bounds with worst-case and RSS intervals. " +
      "All results carry an explicit provenance field. " +
      "No verdict — the tools report limits; the caller assesses fit suitability.",
    logger: options.logger ??
      ((message) => console.error(`[mcp-tolerance] ${message}`)),
  });
  app.registerTools(client.toMCPFormat(), handlers);
  return { app };
}

if (import.meta.main) {
  const cli = parseCli(Deno.args);
  const { app } = createToleranceServer();
  await app.startHttp({
    port: cli.port,
    hostname: cli.hostname,
    corsOrigins: ["http://127.0.0.1", "http://localhost"],
    onListen: ({ hostname, port }) => {
      console.error(
        `[mcp-tolerance] Stateless MCP: http://${hostname}:${port}/mcp`,
      );
    },
  });
}

export interface CliOptions {
  port: number;
  hostname: string;
}

/** Parse the deliberately small stateless HTTP command surface. */
export function parseCli(args: readonly string[]): CliOptions {
  let port = integerEnv("MCP_PORT") ?? DEFAULT_PORT;
  let hostname = env("MCP_HOSTNAME") ?? DEFAULT_HOSTNAME;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument.startsWith("--port=")) {
      port = positivePort(argument.slice("--port=".length), "--port");
    } else if (argument === "--port") {
      port = positivePort(args[++index], "--port");
    } else if (argument.startsWith("--hostname=")) {
      hostname = nonEmpty(argument.slice("--hostname=".length), "--hostname");
    } else if (argument === "--hostname") {
      hostname = nonEmpty(args[++index], "--hostname");
    } else {
      throw new TypeError(`Unknown argument '${argument}'.`);
    }
  }
  return { port, hostname };
}

function positivePort(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new TypeError(`${name} must be an integer between 1 and 65535`);
  }
  return parsed;
}

function integerEnv(name: string): number | undefined {
  const value = env(name);
  return value === undefined ? undefined : positivePort(value, name);
}

function nonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new TypeError(`${name} must not be empty`);
  }
  return value;
}

function env(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch {
    return undefined;
  }
}
