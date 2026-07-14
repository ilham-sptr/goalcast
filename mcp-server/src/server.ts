import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { executeRegisterPrediction, queryContract } from "./injective-client.js";

const server = new McpServer({
  name: "goalcast-prediction-pool-mcp",
  version: "0.1.0",
});

server.registerTool(
  "register_prediction",
  {
    title: "Register Prediction",
    description:
      "Submit a fan's outcome prediction for a World Cup match to the on-chain PredictionPool contract on Injective. Fails if the match has no kickoff set or if kickoff has already passed.",
    inputSchema: {
      matchId: z.string().describe("Match identifier, e.g. 'm-usa-mex-01'"),
      outcome: z.enum(["home", "draw", "away"]).describe("Predicted outcome"),
    },
  },
  async ({ matchId, outcome }) => {
    const result = await executeRegisterPrediction({ matchId, outcome });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

server.registerTool(
  "get_pool_status",
  {
    title: "Get Pool Status",
    description:
      "Read the aggregated prediction split (home/draw/away counts and percentages) for a match from the on-chain PredictionPool contract.",
    inputSchema: {
      matchId: z.string().describe("Match identifier, e.g. 'm-usa-mex-01'"),
    },
  },
  async ({ matchId }) => {
    const status = await queryContract({ get_pool_status: { match_id: matchId } });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status),
        },
      ],
    };
  }
);

const app = express();
app.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));
app.use(express.json());

// Session-aware transport handling, per the MCP Streamable HTTP spec: a
// client first POSTs an `initialize` request (no session id yet); the
// server creates a transport, generates a session id, and returns it via
// the `Mcp-Session-Id` header. Every subsequent request (POST for calls,
// GET for the server->client SSE stream, DELETE to close) must include
// that same header so it's routed to the same transport/session.
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided. Send an 'initialize' request first." },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// Server-initiated SSE stream for an existing session.
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      error: "Missing or unknown Mcp-Session-Id header. Call POST /mcp with an 'initialize' request first.",
      hint: "See mcp-server/README.md for a full curl example.",
      healthCheck: "/health",
    });
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Missing or unknown Mcp-Session-Id header.");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
  delete transports[sessionId];
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "goalcast-mcp-server" }));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`GoalCast MCP server listening on http://localhost:${port}/mcp`);
});
