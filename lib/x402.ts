/**
 * x402 payment gate for GoalCast's premium AI deep-dive.
 *
 * Flow (per the x402 spec):
 *  1. Client calls /api/premium-insight without an X-PAYMENT header.
 *  2. We respond 402 with a JSON payment challenge (price, receiver, network).
 *  3. Client's wallet signs an EIP-3009 transferWithAuthorization payload and
 *     retries the request with an X-PAYMENT header attached.
 *  4. We verify the payment (directly on-chain, or via a facilitator like
 *     https://x402.org/facilitator) and — only then — return the paid content.
 *
 * This file keeps the verification pluggable: `verifyPayment` currently does
 * a facilitator call; for the hackathon demo you can stub it to `true` while
 * wiring the frontend wallet flow, then flip it on for the real demo.
 */

export type PaymentChallenge = {
  x402Version: 1;
  accepts: Array<{
    scheme: "exact";
    network: string;
    maxAmountRequired: string; // atomic units
    resource: string;
    description: string;
    payTo: string;
    asset: string; // USDC contract address
  }>;
};

export function buildPaymentChallenge(resourcePath: string): PaymentChallenge {
  const priceUsdc = process.env.X402_PRICE_USDC ?? "0.05";
  const atomicAmount = Math.round(parseFloat(priceUsdc) * 1_000_000).toString(); // USDC = 6 decimals

  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: process.env.INJECTIVE_NETWORK === "mainnet" ? "injective" : "injective-testnet",
        maxAmountRequired: atomicAmount,
        resource: resourcePath,
        description: "GoalCast AI deep-dive match analysis",
        payTo: process.env.X402_RECEIVER_ADDRESS ?? "",
        asset: process.env.X402_USDC_DENOM ?? "peggy0xUSDC"
      }
    ]
  };
}

export async function verifyPayment(xPaymentHeader: string | null): Promise<boolean> {
  if (!xPaymentHeader) return false;

  // Demo shortcut: always honor the simulated payment used by the chat UI's
  // unlock button, regardless of whether a real facilitator is configured.
  // Remove this branch once real wallet signing replaces the simulated flow.
  if (xPaymentHeader.startsWith("SIMULATED")) {
    return true;
  }

  const facilitatorUrl = process.env.X402_FACILITATOR_URL;
  if (!facilitatorUrl) return false;

  const res = await fetch(`${facilitatorUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment: xPaymentHeader })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.isValid === true;
}
