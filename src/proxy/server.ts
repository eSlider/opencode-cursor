import { execSync } from "node:child_process";
import type { ProxyConfig, ProxyServer } from "./types.js";

const DEFAULT_PORT = 32124;
const PORT_RANGE_SIZE = 256;

/**
 * Returns the set of ports in [minPort, maxPort) that are currently in use (listening).
 * Uses `ss -tlnH` on Linux; falls back to empty set if ss is unavailable.
 */
function getUsedPortsInRange(minPort: number, maxPort: number): Set<number> {
  const used = new Set<number>();
  try {
    const out = execSync("ss -tlnH", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    for (const line of out.split("\n")) {
      const cols = line.trim().split(/\s+/);
      const local = cols[3]; // e.g. "127.0.0.1:32124" or "*:22"
      if (!local) continue;
      const portStr = local.includes(":") ? local.slice(local.lastIndexOf(":") + 1) : local;
      const port = parseInt(portStr, 10);
      if (!Number.isNaN(port) && port >= minPort && port < maxPort) used.add(port);
    }
  } catch {
    // ss not available or failed
  }
  return used;
}

/**
 * Finds an available port in [DEFAULT_PORT, DEFAULT_PORT + PORT_RANGE_SIZE) using system tools.
 * Uses `ss -tlnH` on Linux to avoid binding probes; works when port 0 / Bun.serve probing fails.
 */
export async function findAvailablePort(host = "127.0.0.1"): Promise<number> {
  const minPort = DEFAULT_PORT;
  const maxPort = DEFAULT_PORT + PORT_RANGE_SIZE;
  const used = getUsedPortsInRange(minPort, maxPort);
  for (let p = minPort; p < maxPort; p++) {
    if (!used.has(p)) return p;
  }
  throw new Error(`No available port in range ${minPort}-${maxPort - 1}`);
}

export function createProxyServer(config: ProxyConfig): ProxyServer {
  const requestedPort = config.port ?? 0;
  const host = config.host ?? "127.0.0.1";
  const healthCheckPath = config.healthCheckPath ?? "/health";

  let server: any = null;
  let baseURL = requestedPort > 0 ? `http://${host}:${requestedPort}/v1` : "";

  const bunAny = (globalThis as any).Bun;

  const tryStart = (port: number): boolean => {
    try {
      server = bunAny.serve({
        port,
        hostname: host,
        fetch(request: Request): Response | Promise<Response> {
          const url = new URL(request.url);
          const path = url.pathname;

          if (path === healthCheckPath && request.method === "GET") {
            return Response.json({ ok: true });
          }

          return new Response("Not Found", { status: 404 });
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    async start(): Promise<string> {
      if (server) {
        return baseURL;
      }

      let port: number;
      if (requestedPort > 0) {
        if (tryStart(requestedPort)) {
          port = requestedPort;
        } else {
          port = await findAvailablePort(host);
          if (!tryStart(port)) {
            throw new Error(
              `Failed to start server on port ${requestedPort} or fallback ${port}`
            );
          }
        }
      } else {
        port = await findAvailablePort(host);
        if (!tryStart(port)) {
          throw new Error(`Failed to start server on port ${port}`);
        }
      }

      const actualPort = server.port ?? port ?? DEFAULT_PORT;
      baseURL = `http://${host}:${actualPort}/v1`;
      return baseURL;
    },

    stop(): Promise<void> {
      if (!server) {
        return Promise.resolve();
      }

      server.stop(true);
      server = null;
      baseURL = "";
      return Promise.resolve();
    },

    getBaseURL(): string {
      return baseURL;
    },

    getPort(): number | null {
      return server?.port ?? null;
    },
  };
}
