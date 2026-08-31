import { assert, assertEquals, assertRejects } from "@std/assert";
import { createToleranceServer, createToleranceViewerFileSystem } from "../server.ts";
import { allTools } from "../src/tools/mod.ts";
import {
  TOLERANCE_RECORDED_SESSION_SCHEMAS,
  TOLERANCE_VIEW_APP_MANIFEST,
  TOLERANCE_VIEWER_SESSION_ACTION,
} from "../src/ui/app-manifest.ts";
import {
  FIT_VIEWER_URI,
  LIMITS_VIEWER_URI,
  STACKUP_VIEWER_URI,
  TOOL_VIEWER_URIS,
} from "../src/ui/viewers.ts";

const PROTOCOL_VERSION = "2026-07-28";
const META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": {
    name: "mcp-tolerance-ui-test",
    version: "0.1.0",
  },
};

Deno.test("each visual tool points at exactly one bounded resource URI", () => {
  assertEquals(TOOL_VIEWER_URIS, {
    tolerance_limits: LIMITS_VIEWER_URI,
    tolerance_it: LIMITS_VIEWER_URI,
    tolerance_fit: FIT_VIEWER_URI,
    tolerance_fit_analyze: FIT_VIEWER_URI,
    tolerance_stackup: STACKUP_VIEWER_URI,
  });
  for (const tool of allTools) {
    assertEquals(
      tool._meta?.ui?.resourceUri,
      TOOL_VIEWER_URIS[tool.name as keyof typeof TOOL_VIEWER_URIS],
    );
  }
});

Deno.test("attaching UI metadata does not change content or structuredContent", () => {
  const limits = allTools.find((tool) => tool.name === "tolerance_limits");
  assert(limits);
  const result = limits.handler({
    tolerance_class: "H7",
    nominal_diameter_mm: 25,
  }) as {
    content: string;
    structuredContent: Record<string, unknown>;
  };
  assertEquals(
    result.content,
    "[tolerance_limits] H7 @ 25 mm → hole +0/+21 µm (IT7=21 µm)",
  );
  assertEquals(result.structuredContent.violations, []);
  assertEquals(result.structuredContent.upper_um, 21);
  assertEquals(result.structuredContent.lower_um, 0);
  assertEquals("ui" in result, false);
  assertEquals(result.structuredContent._meta, undefined);
});

Deno.test("viewer registration is skipped until the dist HTML exists", () => {
  const { viewerRegistration, app } = createToleranceServer({
    logger: () => {},
    viewerFileSystem: { exists: () => false, readFile: () => "unreachable" },
  });
  assertEquals(viewerRegistration, {
    registered: [],
    skipped: ["limits-viewer", "fit-viewer", "stackup-viewer"],
  });
  assertEquals(app.hasResource(LIMITS_VIEWER_URI), false);
  assertEquals(app.hasResource(FIT_VIEWER_URI), false);
  assertEquals(app.hasResource(STACKUP_VIEWER_URI), false);
});

Deno.test("viewer registration serves each built HTML resource", async () => {
  const html = {
    [LIMITS_VIEWER_URI]: "<!doctype html><title>limits</title>",
    [FIT_VIEWER_URI]: "<!doctype html><title>fit</title>",
    [STACKUP_VIEWER_URI]: "<!doctype html><title>stackup</title>",
  } as const;
  const { viewerRegistration, app } = createToleranceServer({
    logger: () => {},
    viewerFileSystem: {
      exists: (path) =>
        path.endsWith("src/ui/dist/limits-viewer/index.html") ||
        path.endsWith("src/ui/dist/fit-viewer/index.html") ||
        path.endsWith("src/ui/dist/stackup-viewer/index.html"),
      readFile: (path) => {
        if (path.endsWith("limits-viewer/index.html")) {
          return html[LIMITS_VIEWER_URI];
        }
        if (path.endsWith("fit-viewer/index.html")) return html[FIT_VIEWER_URI];
        if (path.endsWith("stackup-viewer/index.html")) {
          return html[STACKUP_VIEWER_URI];
        }
        throw new Error(path);
      },
    },
  });
  assertEquals(viewerRegistration, {
    registered: ["limits-viewer", "fit-viewer", "stackup-viewer"],
    skipped: [],
  });
  assertEquals(
    (await app.readResourceContent(LIMITS_VIEWER_URI))?.text,
    html[LIMITS_VIEWER_URI],
  );
  assertEquals(
    (await app.readResourceContent(FIT_VIEWER_URI))?.text,
    html[FIT_VIEWER_URI],
  );
  assertEquals(
    (await app.readResourceContent(STACKUP_VIEWER_URI))?.text,
    html[STACKUP_VIEWER_URI],
  );
  assertEquals(
    app.getResourceInfo(LIMITS_VIEWER_URI)?.mimeType,
    "text/html;profile=mcp-app",
  );
});

Deno.test("JSR HTTPS module URLs resolve viewers without a local filesystem path", async () => {
  const moduleUrl = "https://jsr.io/@casys/mcp-tolerance/0.3.3/server.ts";
  const viewerUrl =
    "https://jsr.io/@casys/mcp-tolerance/0.3.3/src/ui/dist/limits-viewer/index.html";
  const html = "<!doctype html><title>Remote limits</title>";
  const { viewerRegistration, app } = createToleranceServer({
    logger: () => {},
    viewerModuleUrl: moduleUrl,
    viewerFileSystem: {
      exists: (path) => path === viewerUrl,
      readFile: (path) => {
        assertEquals(path, viewerUrl);
        return html;
      },
    },
  });
  assertEquals(viewerRegistration.registered.includes("limits-viewer"), true);
  assertEquals((await app.readResourceContent(LIMITS_VIEWER_URI))?.text, html);
});

Deno.test("remote viewer filesystem fetches HTTP resources actionably", async () => {
  const viewerUrl = "https://example.test/mcp-tolerance/limits-viewer/index.html";
  const fileSystem = createToleranceViewerFileSystem((url) => {
    assertEquals(url, viewerUrl);
    return Promise.resolve(
      new Response("not published", { status: 404, statusText: "Not Found" }),
    );
  });
  assertEquals(fileSystem.exists(viewerUrl), true);
  await assertRejects(
    () => Promise.resolve(fileSystem.readFile(viewerUrl)),
    Error,
    "Unable to fetch mcp-tolerance viewer",
  );
});

Deno.test("tools/list keeps output schemas closed after UI metadata is attached", async () => {
  const { app } = createToleranceServer({
    logger: () => {},
    viewerFileSystem: { exists: () => false, readFile: () => "unreachable" },
  });
  const port = freePort();
  const http = await app.startHttp({
    port,
    hostname: "127.0.0.1",
    onListen: () => {},
  });
  try {
    const listed = await rpc(`http://127.0.0.1:${port}/mcp`, "tools/list");
    const tools =
      (listed.body.result as { tools: Array<Record<string, unknown>> }).tools;
    for (const tool of tools) {
      assertEquals(
        (tool.outputSchema as Record<string, unknown>).additionalProperties,
        false,
      );
      assertEquals(
        (tool._meta as { ui?: { resourceUri?: string } } | undefined)?.ui
          ?.resourceUri,
        TOOL_VIEWER_URIS[tool.name as keyof typeof TOOL_VIEWER_URIS],
      );
    }
  } finally {
    await http.shutdown();
  }
});

Deno.test("versioned viewer HTML is one recorded mono-object App per resource", async () => {
  const expected: Record<
    string,
    { present: string; sessionSchema: string }
  > = {
    "limits-viewer": {
      present: "tolerance.limits-result",
      sessionSchema: TOLERANCE_RECORDED_SESSION_SCHEMAS.limits,
    },
    "fit-viewer": {
      present: "tolerance.fit-result",
      sessionSchema: TOLERANCE_RECORDED_SESSION_SCHEMAS.fit,
    },
    "stackup-viewer": {
      present: "tolerance.stackup-result",
      sessionSchema: TOLERANCE_RECORDED_SESSION_SCHEMAS.stackup,
    },
  };
  for (const [viewer, keys] of Object.entries(expected)) {
    const html = await Deno.readTextFile(
      new URL(`../src/ui/dist/${viewer}/index.html`, import.meta.url),
    );
    assertEquals((html.match(/<!doctype html>/gi) ?? []).length, 1);
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assertEquals(scripts.length, 1);
    const source = scripts[0][1];
    assert(source.trim().length > 0);
    assertEquals(source.includes("BUNDLE_PLACEHOLDER"), false);
    new Function(source);
    assert(html.includes("io.casys.mcp.view-components/v1"));
    assert(html.includes("mcp-view-semantic-element"));
    assert(html.includes(TOLERANCE_VIEW_APP_MANIFEST.app.id));
    assert(html.includes(TOLERANCE_VIEW_APP_MANIFEST.app.version));
    assert(html.includes(TOLERANCE_VIEWER_SESSION_ACTION));
    assert(html.includes(keys.sessionSchema));
    assert(html.includes(keys.present));
    for (
      const absent of [
        "tolerance.limits-not-checked",
        "tolerance.fit-members",
        "tolerance.fit-not-checked",
        "tolerance.stackup-contributors",
        "tolerance.stackup-not-checked",
      ]
    ) {
      assertEquals(
        html.includes(absent),
        false,
        `${viewer} must not embed ${absent}`,
      );
    }
  }
});

function freePort(): number {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}

async function rpc(
  url: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<{ response: Response; body: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "mcp-protocol-version": PROTOCOL_VERSION,
      "mcp-method": method,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: { ...params, _meta: META },
    }),
  });
  const body = await response.json() as Record<string, unknown>;
  return { response, body };
}
