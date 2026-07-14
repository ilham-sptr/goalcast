# GoalCast MCP Server

A small, standards-compliant MCP server (using the official
`@modelcontextprotocol/sdk`, Streamable HTTP transport) that wraps the
`PredictionPool` CosmWasm contract deployed on Injective testnet. It exposes
exactly two tools:

| Tool | What it does |
|---|---|
| `register_prediction` | Signs and broadcasts `RegisterPrediction` to the contract |
| `get_pool_status` | Reads the current home/draw/away split for a match |

This is what GoalCast's Next.js app (`lib/injective.ts`) connects to as a
real MCP client — not a hand-rolled REST bridge.

## Setup

```bash
cd mcp-server
npm install
cp .env.example .env
```

Fill `.env`:

```dotenv
INJECTIVE_PRIVATE_KEY=<testnet wallet private key, no 0x needed either way>
INJECTIVE_NETWORK=testnet
PREDICTION_POOL_CONTRACT_ADDRESS=inj1...   # from DEPLOY.md step 4
PORT=8787
```

> Use a **dedicated testnet-only wallet** here — this key signs every
> prediction the server submits. In this hackathon MVP the MCP server's
> wallet is the signer for all predictions (see "Known limitation" below).

Run it:

```bash
npm run dev
```

You should see:
```
GoalCast MCP server listening on http://localhost:8787/mcp
```

## Connect the Next.js app to it

In the main app's `.env.local`:

```dotenv
INJECTIVE_MCP_SERVER_URL=http://localhost:8787/mcp
```

Restart `npm run dev` in the app root. `lib/injective.ts` will now call the
real tools instead of its simulated fallback.

## Test it directly (without the app)

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": { "name": "get_pool_status", "arguments": { "matchId": "m-usa-mex-01" } }
  }'
```

Or point the [MCP Inspector](https://modelcontextprotocol.io) at
`http://localhost:8787/mcp` for a UI to browse and call the tools.

## Known limitation (worth mentioning in your demo/judging notes)

Right now the MCP server's own wallet signs every prediction — a fan's
"vote" is broadcast by the server, not by their own wallet. That's fine for
a hackathon MVP (it proves the full MCP → contract → chain path works), but
a production version should have the fan sign client-side (e.g. via Keplr)
and have the MCP server only *build* the unsigned tx, or verify a
fan-signed payload before relaying it. Worth a sentence in your submission
write-up — judges tend to reward projects that name their own known
limitations over ones that gloss over them.
