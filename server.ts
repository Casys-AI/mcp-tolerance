/** Stateless HTTP MCP server for ISO 286-1 dimensional tolerance checks. */

import { McpApp, type RegisterViewersSummary } from "@casys/mcp-server";
import { ToleranceToolsClient } from "./src/client.ts";
import {
  FIT_VIEWER_NAME,
  LIMITS_VIEWER_NAME,
  STACKUP_VIEWER_NAME,
  TOLERANCE_VIEWER_NAMES,
} from "./src/ui/viewers.ts";

const VERSION = "0.3.3";
const DEFAULT_PORT = 3019;
const DEFAULT_HOSTNAME = "127.0.0.1";

export interface CreateToleranceServerOptions {
  logger?: (message: string) => void;
  viewerFileSystem?: ToleranceViewerFileSystem;
  viewerModuleUrl?: string;
}

export interface ToleranceViewerFileSystem {
  exists(path: string): boolean;
  readFile(path: string): string | Promise<string>;
}

export function createToleranceServer(
  options: CreateToleranceServerOptions = {},
): { app: McpApp; viewerRegistration: RegisterViewersSummary } {
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
  const viewerRegistration = registerToleranceViewers(
    app,
    options.viewerFileSystem,
    options.viewerModuleUrl,
  );
  return { app, viewerRegistration };
}

/**
 * Registers built viewers when present. A source checkout may not have a UI
 * build yet; McpApp then reports the absent viewers as skipped and the
 * text/structured tool results remain fully usable.
 */
export function registerToleranceViewers(
  app: McpApp,
  fileSystem: ToleranceViewerFileSystem = defaultViewerFileSystem,
  moduleUrl: string = import.meta.url,
): RegisterViewersSummary {
  return app.registerViewers({
    prefix: "mcp-tolerance",
    viewers: [...TOLERANCE_VIEWER_NAMES],
    moduleUrl,
    exists: fileSystem.exists,
    readFile: fileSystem.readFile,
    humanName: (name) => {
      if (name === LIMITS_VIEWER_NAME) return "ISO 286-1 Limits";
      if (name === FIT_VIEWER_NAME) return "ISO 286-1 Fit";
      if (name === STACKUP_VIEWER_NAME) return "1D Stack-up";
      throw new TypeError(`Unknown mcp-tolerance viewer ${name}.`);
    },
  });
}

/**
 * JSR resolves `import.meta.url` to HTTPS, while a source checkout resolves it
 * to a file path. The viewers are included in the package, so remote URLs are
 * eligible at registration time and fetched only when a client reads them.
 */
export function createToleranceViewerFileSystem(
  fetchViewer: (url: string) => Promise<Response> = (url) => fetch(url),
): ToleranceViewerFileSystem {
  return {
    exists(path) {
      if (isRemoteViewerUrl(path)) return true;
      try {
        return Deno.statSync(path).isFile;
      } catch (error) {
        if (
          error instanceof Deno.errors.NotFound ||
          error instanceof Deno.errors.PermissionDenied ||
          (error instanceof Error && error.name === "NotCapable")
        ) {
          return false;
        }
        throw error;
      }
    },
    async readFile(path) {
      if (!isRemoteViewerUrl(path)) return await Deno.readTextFile(path);
      let response: Response;
      try {
        response = await fetchViewer(path);
      } catch (error) {
        throw new Error(
          `Unable to fetch mcp-tolerance viewer from ${path}.`,
          { cause: error },
        );
      }
      if (!response.ok) {
        throw new Error(
          `Unable to fetch mcp-tolerance viewer from ${path}: HTTP ${response.status} ${response.statusText}.`,
        );
      }
      return await response.text();
    },
  };
}

const defaultViewerFileSystem = createToleranceViewerFileSystem();

function isRemoteViewerUrl(path: string): boolean {
  try {
    const protocol = new URL(path).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

if (import.meta.main) {
  const cli = parseCli(Deno.args);
  const { app, viewerRegistration } = createToleranceServer();
  if (viewerRegistration.skipped.length > 0) {
    console.error(
      "[mcp-tolerance] UI viewers are not built; run `deno task build:ui`.",
    );
  }
  if (cli.mode === "stdio") {
    await app.start();
  } else {
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
}

export interface HttpCliOptions {
  mode: "http";
  port: number;
  hostname: string;
}

export interface StdioCliOptions {
  mode: "stdio";
}

export type CliOptions = HttpCliOptions | StdioCliOptions;

/** Parse the deliberately small, mutually exclusive transport command surface. */
export function parseCli(args: readonly string[]): CliOptions {
  if (args.includes("--stdio")) {
    if (args.length !== 1) {
      throw new TypeError("--stdio cannot be combined with HTTP options");
    }
    return { mode: "stdio" };
  }

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
  return { mode: "http", port, hostname };
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
