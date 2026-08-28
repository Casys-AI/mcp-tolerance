/**
 * Exercise the native stdio entry point exactly as a desktop MCP client does:
 * a modern-first discovery request and a legacy initialize exchange followed
 * by a real tolerance operation.
 */
import { assertEquals } from "@std/assert";
import { TextLineStream } from "@std/streams/text-line-stream";

async function collectResponses(
  stdout: ReadableStream<Uint8Array>,
  expected: number,
  timeoutMs: number,
): Promise<Record<string, unknown>[]> {
  const responses: Record<string, unknown>[] = [];
  const lines = stdout
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());
  const deadline = AbortSignal.timeout(timeoutMs);
  const reader = lines.getReader();
  try {
    while (responses.length < expected) {
      if (deadline.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      if (value.trim() === "") continue;
      responses.push(JSON.parse(value) as Record<string, unknown>);
    }
  } finally {
    reader.releaseLock();
  }
  return responses;
}

function startStdioServer(): Deno.ChildProcess {
  return new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-all", "server.ts", "--stdio"],
    cwd: new URL("..", import.meta.url).pathname,
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  }).spawn();
}

async function stop(
  server: Deno.ChildProcess,
  writer: WritableStreamDefaultWriter<Uint8Array>,
): Promise<void> {
  await writer.close();
  try {
    server.kill("SIGTERM");
  } catch {
    // The native stdio server can exit cleanly when its input closes.
  }
  await server.status;
}

const encoder = new TextEncoder();

Deno.test("native stdio accepts modern server/discover as its first request", async () => {
  const server = startStdioServer();
  const writer = server.stdin.getWriter();

  try {
    await writer.write(encoder.encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": {
              name: "stdio-server-modern-test",
              version: "0",
            },
          },
        },
      }) + "\n",
    ));

    const responses = await collectResponses(server.stdout, 1, 30_000);
    assertEquals(responses.length, 1, "expected server/discover response");
    assertEquals(responses[0].id, 1);
    const discovered = responses[0].result as Record<string, unknown>;
    assertEquals(discovered.resultType, "complete");
    const meta = discovered._meta as Record<string, unknown>;
    assertEquals(meta["io.modelcontextprotocol/serverInfo"], {
      name: "mcp-tolerance",
      version: "0.3.2",
    });
  } finally {
    await stop(server, writer);
  }
});

Deno.test(
  "native stdio accepts legacy initialize and executes tolerance_it",
  async () => {
    const server = startStdioServer();
    const writer = server.stdin.getWriter();
    const send = (message: Record<string, unknown>) =>
      writer.write(encoder.encode(JSON.stringify(message) + "\n"));

    try {
      await send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "stdio-server-test", version: "0" },
        },
      });
      await send({ jsonrpc: "2.0", method: "notifications/initialized" });
      await send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "tolerance_it",
          arguments: { grade: 7, nominal_diameter_mm: 25 },
        },
      });

      const responses = await collectResponses(server.stdout, 2, 30_000);
      assertEquals(responses.length, 2, "expected initialize and tools/call responses");

      const initialized = responses[0].result as Record<string, unknown>;
      assertEquals(responses[0].id, 1);
      assertEquals(initialized.protocolVersion, "2025-06-18");
      assertEquals(
        (initialized.serverInfo as Record<string, unknown>).name,
        "mcp-tolerance",
      );

      const called = responses[1].result as Record<string, unknown>;
      assertEquals(responses[1].id, 2);
      const structured = called.structuredContent as Record<string, unknown>;
      assertEquals(structured.grade, 7);
      assertEquals(structured.IT_um, 21);
    } finally {
      await stop(server, writer);
    }
  },
);
