import { describe, it, expect } from "bun:test";
import { createProxyServer, findAvailablePort } from "../../src/proxy/server.js";

describe("ProxyServer", () => {
  it("should start on requested port", async () => {
    const port = await findAvailablePort();
    const server = createProxyServer({ port });
    const baseURL = await server.start();
    expect(baseURL).toBe(`http://127.0.0.1:${port}/v1`);
    await server.stop();
  });

  it("should respond to health check", async () => {
    const port = await findAvailablePort();
    const server = createProxyServer({ port });
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    await server.stop();
  });
});
