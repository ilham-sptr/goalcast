/**
 * Injective integration layer.
 *
 * GoalCast talks to Injective in two ways:
 *  1. Directly via @injectivelabs/sdk-ts for reads (pool status, balances).
 *  2. Through the Injective MCP Server for agent-driven actions — the AI
 *     analyst can call MCP tools like `register_prediction` on the user's
 *     behalf during a chat, instead of the frontend building a raw tx.
 *
 * The MCP Server itself runs as a separate process (per Injective's docs,
 * it speaks MCP over stdio/SSE to any MCP-compatible client — Claude
 * Desktop, Cursor, LangChain, or a custom Node client like this one).
 * `callMcpTool` below is the thin bridge our API routes use to reach it.
 *
 * TODO before demo: point MCP_SERVER_URL at a running instance of
 * `@injectivelabs/mcp-server` (or the hosted endpoint from
 * agents.injective.com) and deploy `PredictionPool` from /contracts.
 */

import { getNetworkEndpoints, Network } from "@injectivelabs/networks";
import { ChainGrpcBankApi } from "@injectivelabs/sdk-ts";

const NETWORK =
  process.env.INJECTIVE_NETWORK === "mainnet" ? Network.Mainnet : Network.Testnet;

export function getEndpoints() {
  return getNetworkEndpoints(NETWORK);
}

/** Read-only: fetch a wallet's INJ/USDC balances for the wallet-connect widget. */
export async function getBalances(injectiveAddress: string) {
  const endpoints = getEndpoints();
  const bankApi = new ChainGrpcBankApi(endpoints.grpc);
  const balances = await bankApi.fetchBalances(injectiveAddress);
  return balances;
}

export type PredictionInput = {
  matchId: string;
  predictedOutcome: "HOME" | "DRAW" | "AWAY";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  injectiveAddress: string;
};

// In-memory prediction tracking to simulate active voting and progress bar updates in real-time
const SIMULATED_PREDICTIONS: Record<string, { HOME: number; DRAW: number; AWAY: number }> = {};

function getDeterministicBaseline(matchId: string) {
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) {
    hash = matchId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const homeVal = 30 + Math.abs(hash % 30); // 30 to 59
  const drawVal = 15 + Math.abs((hash >> 4) % 15); // 15 to 29
  const awayVal = 100 - (homeVal + drawVal);
  return { home: homeVal, draw: drawVal, away: awayVal };
}

/**
 * Calls the Injective MCP Server's `register_prediction` tool.
 * This is a thin JSON-RPC-over-HTTP bridge; swap the fetch below for the
 * official MCP client SDK once wired to a live server.
 */
export async function registerPredictionViaMcp(input: PredictionInput) {
  // Save prediction locally first to reflect changes immediately in the UI
  if (!SIMULATED_PREDICTIONS[input.matchId]) {
    SIMULATED_PREDICTIONS[input.matchId] = { HOME: 0, DRAW: 0, AWAY: 0 };
  }
  SIMULATED_PREDICTIONS[input.matchId][input.predictedOutcome] += 10; // Increment weight for immediate impact

  const mcpUrl = process.env.INJECTIVE_MCP_SERVER_URL;
  if (!mcpUrl) {
    // Local/demo fallback so the UI flow is testable before the MCP
    // server + contract are deployed.
    return {
      ok: true,
      simulated: true,
      txHash: `SIMULATED-${Date.now()}`,
      ...input
    };
  }

  try {
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "register_prediction",
        arguments: input
      })
    });

    if (!res.ok) {
      throw new Error(`MCP server returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn("MCP register_prediction failed, falling back to simulation:", err);
    return {
      ok: true,
      simulated: true,
      txHash: `SIMULATED-FALLBACK-${Date.now()}`,
      ...input
    };
  }
}

export async function getPoolStatusViaMcp(matchId: string) {
  const mcpUrl = process.env.INJECTIVE_MCP_SERVER_URL;
  
  // Calculate dynamic baseline + current user predictions
  const localVotes = SIMULATED_PREDICTIONS[matchId] || { HOME: 0, DRAW: 0, AWAY: 0 };
  const baseline = getDeterministicBaseline(matchId);

  if (!mcpUrl) {
    const totalVotes = 100 + localVotes.HOME + localVotes.DRAW + localVotes.AWAY;
    const homePercent = Math.round(((baseline.home + localVotes.HOME) / totalVotes) * 100);
    const drawPercent = Math.round(((baseline.draw + localVotes.DRAW) / totalVotes) * 100);
    const awayPercent = 100 - (homePercent + drawPercent);

    return { 
      matchId, 
      home: homePercent, 
      draw: drawPercent, 
      away: awayPercent, 
      simulated: true 
    };
  }

  try {
    const res = await fetch(mcpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "get_pool_status", arguments: { matchId } })
    });
    
    if (!res.ok) throw new Error("MCP fetch failed");
    return res.json();
  } catch (err) {
    // Graceful fallback to local computation if MCP server fails
    const totalVotes = 100 + localVotes.HOME + localVotes.DRAW + localVotes.AWAY;
    const homePercent = Math.round(((baseline.home + localVotes.HOME) / totalVotes) * 100);
    const drawPercent = Math.round(((baseline.draw + localVotes.DRAW) / totalVotes) * 100);
    const awayPercent = 100 - (homePercent + drawPercent);

    return { 
      matchId, 
      home: homePercent, 
      draw: drawPercent, 
      away: awayPercent, 
      simulated: true 
    };
  }
}
