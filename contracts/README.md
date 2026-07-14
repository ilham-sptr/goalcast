# PredictionPool contract (stub)

GoalCast's on-chain piece is intentionally small: a single CosmWasm contract
on Injective that records fan predictions and lets the Injective MCP Server
expose two tools against it.

## Suggested contract shape

State:
- `predictions: Map<(match_id, address), Prediction>`
- `pool_totals: Map<match_id, {home: u64, draw: u64, away: u64}>`

ExecuteMsg:
- `RegisterPrediction { match_id: String, outcome: Outcome }`
  - one prediction per address per match_id (overwrite = re-submit allowed
    until kickoff, reject after — enforce with a `kickoff_timestamp` passed
    in at instantiation or set via an admin `SetKickoff` msg per match)

QueryMsg:
- `GetPoolStatus { match_id: String }` → `{ home, draw, away }` percentages
- `GetPrediction { match_id: String, address: String }`

## Wiring to the MCP Server

Injective's MCP Server pattern lets you register custom tools that wrap
CosmWasm execute/query messages. Two tools cover this app:

```
register_prediction(matchId, predictedOutcome, injectiveAddress)
  -> broadcasts RegisterPrediction via the contract, returns txHash

get_pool_status(matchId)
  -> queries GetPoolStatus, returns { home, draw, away }
```

`lib/injective.ts` in the app already calls these two tool names — once the
contract is deployed and the MCP server is pointed at it, set
`INJECTIVE_MCP_SERVER_URL` in `.env.local` and the simulated fallback in
`registerPredictionViaMcp` / `getPoolStatusViaMcp` stops being used
automatically.

## Suggested build order (fastest path to a working demo)

1. Scaffold with `cargo generate --git https://github.com/InjectiveLabs/cw-template`
   (or reuse any minimal CosmWasm counter template — the state above is
   simple enough to hand-write in under 150 lines).
2. Deploy to Injective testnet with `injectived tx wasm store` /
   `instantiate` (or the JS deploy flow in `@injectivelabs/sdk-ts`).
3. Confirm `RegisterPrediction` + `GetPoolStatus` work via
   `injectived query wasm contract-state smart`.
4. Wrap those two calls as MCP tools and point the app's env var at your
   running MCP server.
