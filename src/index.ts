import { AgentSideConnection, ndJsonStream } from "@agentclientprotocol/sdk";
import { CursorAcpHybridAgent } from "./acp/agent.js";
import { CursorNativeWrapper } from "./acp/cursor.js";

export function runAcp() {
  const input = process.stdin as any;
  const output = process.stdout as any;
  const stream = ndJsonStream(input, output);
  new AgentSideConnection((client: any) => new CursorAcpHybridAgent(client), stream);

  process.stdin.resume();
}

export { CursorAcpHybridAgent, CursorNativeWrapper };
