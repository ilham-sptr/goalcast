# GoalCast — AI World Cup Fan Companion on Injective

**Built for The Injective Global Cup (July 3–19, 2026)**

GoalCast is a World Cup fan web app that combines AI match analysis, on-demand micropayments, and on-chain fan prediction pools — built on four cutting-edge Injective technologies at once: **x402, CCTP, MCP Server, and Agent Skills**.

🔗 **Live App**: [https://goalcast-worldcup.vercel.app/](https://goalcast-worldcup.vercel.app/)  
🔗 **Demo Video**: [Insert YouTube/Loom link here]

---

## Problem Statement

1. **Fan predictions lack transparency.** Traditional polls store data in centralized databases that can be edited or deleted at any time. GoalCast records every prediction on-chain via smart contract, making it publicly verifiable and immutable.

2. **High-quality AI insights are locked behind monthly subscriptions.** Fans often only need deep analysis for specific matches. GoalCast uses x402 micropayments — pay just $0.05 per analysis when you actually use it.

3. **Difficult onboarding for fans outside the Injective ecosystem.** Bridging USDC manually is complicated. GoalCast enables seamless native USDC transfers from Ethereum/Base to Injective using CCTP.

## Key Features

| Feature                        | Description |
|-------------------------------|-----------|
| **Live Dashboard**            | Real-time World Cup schedule, scores, and prediction pool visualizations |
| **AI Match Analyst**          | Chat with a specialized AI agent (`world-cup-analyst`) that analyzes team form, key matchups, and prediction confidence |
| **Premium Deep-Dive (x402)**  | In-depth analysis (minute-by-minute momentum, set-piece threats) unlocked via $0.05 USDC micropayment following HTTP 402 standard |
| **Fan Prediction Pool**       | Fan predictions permanently recorded on Injective via custom MCP Server and CosmWasm smart contract |
| **Cross-Chain Funding (CCTP)**| Easy USDC top-ups from other chains directly to Injective without third-party bridges |

## End-to-End Flow
