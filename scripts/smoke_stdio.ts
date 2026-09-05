/**
 * Smoke an MCP server launched as a native stdio process.
 *
 * Usage:
 *   deno run --allow-run scripts/smoke_stdio.ts --expect-version 0.3.5 -- <command> [args...]
 *
 * The target is launched twice so each supported first-request path is proved
 * independently. Every stdout line must be a JSON-RPC object, and closing the
 * input stream must produce a clean process exit before the deadline.
 */

const TIMEOUT_MS = 30_000;
const SERVER_NAME = "mcp-tolerance";
const encoder = new TextEncoder();

interface SmokeInvocation {
  expectedVersion: string;
  command: string;
  args: string[];
}

interface JsonObject {
  [key: string]: unknown;
}

function parseInvocation(args: string[]): SmokeInvocation {
  if (args[0] !== "--expect-version" || !args[1]) {
    throw new Error("usage: --expect-version <version> -- <command> [args...]");
  }

  const commandStart = args[2] === "--" ? 3 : 2;
  if (!args[commandStart]) {
    throw new Error("a stdio command is required after --expect-version <version>");
  }

  return {
    expectedVersion: args[1],
    command: args[commandStart],
    args: args.slice(commandStart + 1),
  };
}

function asObject(value: unknown, context: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be a JSON object`);
  }
  return value as JsonObject;
}

function expectEqual(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected) {
    throw new Error(
      `${context}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function responseForId(responses: JsonObject[], id: number): JsonObject {
  const response = responses.find((candidate) => candidate.id === id);
  if (!response) {
    throw new Error(`missing JSON-RPC response for id ${id}`);
  }
  expectEqual(response.jsonrpc, "2.0", `response ${id} JSON-RPC version`);
  if ("error" in response) {
    throw new Error(
      `response ${id} returned JSON-RPC error: ${JSON.stringify(response.error)}`,
    );
  }
  return response;
}

function timeout<T>(promise: Promise<T>, context: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expires = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${context} timed out after ${TIMEOUT_MS} ms`)),
      TIMEOUT_MS,
    );
  });
  return Promise.race([promise, expires]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function readJsonRpcLines(
  stdout: ReadableStream<Uint8Array>,
): Promise<JsonObject[]> {
  const reader = stdout.pipeThrough(new TextDecoderStream("utf-8", { fatal: true }))
    .getReader();
  const lines: JsonObject[] = [];
  let buffered = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += value;

      let newline: number;
      while ((newline = buffered.indexOf("\n")) !== -1) {
        const line = buffered.slice(0, newline).replace(/\r$/, "");
        buffered = buffered.slice(newline + 1);
        lines.push(parseJsonRpcLine(line));
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (buffered !== "") lines.push(parseJsonRpcLine(buffered));
  return lines;
}

function parseJsonRpcLine(line: string): JsonObject {
  if (line.trim() === "") {
    throw new Error("stdout contained a blank line instead of a JSON-RPC frame");
  }
  try {
    return asObject(JSON.parse(line), "stdout JSON-RPC frame");
  } catch (error) {
    throw new Error(
      `stdout contained a non-JSON-RPC line: ${JSON.stringify(line)} (${error})`,
    );
  }
}

async function stopAfterFailure(server: Deno.ChildProcess): Promise<void> {
  try {
    server.kill("SIGTERM");
  } catch {
    // The target may already have exited after stdin was closed.
  }
  try {
    await timeout(server.status, "stdio target cleanup");
  } catch {
    try {
      server.kill("SIGKILL");
    } catch {
      // The process is already gone.
    }
  }
}

async function exchange(
  invocation: SmokeInvocation,
  name: string,
  messages: JsonObject[],
): Promise<JsonObject[]> {
  const server = new Deno.Command(invocation.command, {
    args: invocation.args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const stdout = readJsonRpcLines(server.stdout);
  const stderr = new Response(server.stderr).text();
  const writer = server.stdin.getWriter();

  try {
    for (const message of messages) {
      await writer.write(encoder.encode(JSON.stringify(message) + "\n"));
    }
    await writer.close();

    const [responses, status, stderrText] = await timeout(
      Promise.all([stdout, server.status, stderr]),
      `${name} stdio exchange`,
    );
    if (!status.success) {
      throw new Error(
        `${name} target exited with ${status.code}; stderr: ${
          stderrText.trim() || "(empty)"
        }`,
      );
    }
    return responses;
  } catch (error) {
    await stopAfterFailure(server);
    throw error;
  } finally {
    writer.releaseLock();
  }
}

function modernDiscoverRequest(): JsonObject {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "server/discover",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {
          name: "mcp-tolerance-stdio-smoke",
          version: "1",
        },
      },
    },
  };
}

function legacyInitializeRequest(): JsonObject {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "mcp-tolerance-stdio-smoke", version: "1" },
    },
  };
}

function initializedNotification(): JsonObject {
  return { jsonrpc: "2.0", method: "notifications/initialized" };
}

function toleranceItRequest(): JsonObject {
  return {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "tolerance_it",
      arguments: { grade: 7, nominal_diameter_mm: 25 },
    },
  };
}

async function smoke(invocation: SmokeInvocation): Promise<void> {
  const modern = await exchange(
    invocation,
    "modern server/discover",
    [modernDiscoverRequest()],
  );
  expectEqual(modern.length, 1, "modern server/discover response count");
  const discovery = asObject(responseForId(modern, 1).result, "server/discover result");
  expectEqual(discovery.resultType, "complete", "server/discover result type");
  const meta = asObject(discovery._meta, "server/discover metadata");
  const serverInfo = asObject(
    meta["io.modelcontextprotocol/serverInfo"],
    "server/discover server identity",
  );
  expectEqual(serverInfo.name, SERVER_NAME, "server/discover server name");
  expectEqual(
    serverInfo.version,
    invocation.expectedVersion,
    "server/discover server version",
  );

  const legacy = await exchange(invocation, "legacy initialize/tools/call", [
    legacyInitializeRequest(),
    initializedNotification(),
    toleranceItRequest(),
  ]);
  expectEqual(legacy.length, 2, "legacy response count");
  const initialized = asObject(responseForId(legacy, 1).result, "initialize result");
  expectEqual(
    initialized.protocolVersion,
    "2025-06-18",
    "legacy negotiated protocol version",
  );
  const legacyServerInfo = asObject(initialized.serverInfo, "legacy server identity");
  expectEqual(legacyServerInfo.name, SERVER_NAME, "legacy server name");
  expectEqual(
    legacyServerInfo.version,
    invocation.expectedVersion,
    "legacy server version",
  );

  const called = asObject(responseForId(legacy, 2).result, "tolerance_it result");
  const structured = asObject(
    called.structuredContent,
    "tolerance_it structured content",
  );
  expectEqual(structured.grade, 7, "tolerance_it grade");
  expectEqual(structured.IT_um, 21, "tolerance_it IT value");
}

if (import.meta.main) {
  try {
    await smoke(parseInvocation(Deno.args));
    console.log("native stdio smoke passed");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
