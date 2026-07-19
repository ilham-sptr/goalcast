# GoalCast — AI World Cup Fan Companion on Injective

**Built for The Injective Global Cup (July 3–19, 2026)**

GoalCast is a World Cup fan web app that combines AI match analysis, on-demand micropayments, and on-chain fan prediction pools — built simultaneously on four cutting-edge Injective technologies: **x402, CCTP, MCP Server, and Agent Skills**.

🔗 **Live App**: [https://goalcast-worldcup.vercel.app/](https://goalcast-worldcup.vercel.app/)
🔗 **Demo Video**: [Insert YouTube/Loom link here]

---

## Problem Statement

1. **Fan predictions lack transparency.** Traditional polling platforms store data in centralized databases that can be edited or deleted unilaterally. GoalCast records every prediction on-chain, making it publicly verifiable and immutable.
2. **Premium AI insights are locked behind subscriptions.** Fans often only need deep analysis for specific matches. GoalCast uses x402 micropayments — pay only $0.05 per analysis when you actually use it.
3. **Difficult cross-chain participation.** Bridging USDC manually is complicated for users outside Injective. GoalCast enables seamless native USDC transfers from Ethereum/Base to Injective using CCTP.

## Key Features

| Feature | Description |
|---|---|
| **Live Dashboard** | Real-time World Cup schedule, scores, and prediction pool visualizations |
| **AI Match Analyst** | Chat with a specialized AI agent (`world-cup-analyst`) that analyzes team form, key matchups, and prediction confidence |
| **Premium Deep-Dive (x402)** | In-depth analysis (minute-by-minute momentum, set-piece threats, etc.) unlocked via a $0.05 USDC micropayment following the HTTP 402 standard |
| **Fan Prediction Pool** | Fan predictions permanently recorded on Injective via a custom MCP Server and CosmWasm smart contract |
| **Cross-Chain Funding (CCTP)** | Easy USDC top-ups from other chains directly to Injective without third-party bridges |

## End-to-End Flow

The diagram below walks through what happens from the moment a fan opens the app to the moment their prediction and payment are settled on-chain.

**1. Fan opens the Live Dashboard**
The frontend (Next.js 14 + TypeScript, hosted on Vercel) fetches the live World Cup schedule, scores, and current prediction pool odds and renders them in real time.

**2. Fan chats with the AI Match Analyst**
A message is sent to the `world-cup-analyst` Agent Skill. The agent pulls match context (team form, head-to-head history, lineups) and returns a free-tier summary with a prediction-confidence indicator.

**3. Fan requests a Premium Deep-Dive**
When the fan asks for deeper insight (momentum swings, set-piece threats, substitution patterns), the API responds with an HTTP 402 Payment Required status per the x402 standard, along with the payment details needed to unlock the report.

**4. Micropayment via x402**
The fan's wallet signs a $0.05 USDC payment. Once the payment is confirmed on-chain, the API re-serves the request and streams the full deep-dive analysis back to the fan.

**5. Fan submits a prediction**
The prediction (match outcome, score, or scorer) is sent to the custom MCP Server, which validates the request and relays it to the CosmWasm smart contract deployed on the Injective testnet.

**6. Prediction recorded on-chain**
The smart contract writes the prediction to the Fan Prediction Pool, making it permanent, publicly verifiable, and tamper-proof. The dashboard's pool visualization updates in real time.

**7. Cross-chain funding via CCTP (optional)**
If the fan's USDC lives on Ethereum or Base, they can initiate a native transfer to Injective using Circle's CCTP — no third-party bridge, no wrapped assets. Funds arrive as native USDC and are immediately available to spend on x402 micropayments or prediction stakes.

**8. Loop continues**
As new matches go live, the fan repeats the cycle: check the dashboard → ask the AI analyst → unlock deep-dives with x402 → lock in predictions on-chain → top up cross-chain with CCTP as needed.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript — deployed on Vercel
- **AI Agent**: Custom `world-cup-analyst` Agent Skill
- **Payments**: x402 (HTTP 402-based USDC micropayments)
- **Cross-Chain**: Circle CCTP (native USDC transfer, Ethereum/Base → Injective)
- **On-Chain Logic**: Custom CosmWasm `PredictionPool` smart contract on Injective testnet
- **Backend Integration**: Custom MCP Server, deployed on Railway

## Repositories

- Frontend — Vercel deployment
- MCP Server — Railway deployment
- Smart Contract — CosmWasm `PredictionPool`, Injective testnet

## Team

Built by **Norm Expert** for The Injective Global Cup (July 2026).
