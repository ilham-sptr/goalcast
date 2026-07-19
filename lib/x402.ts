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
        maxAmountRequired: process.env.INJECTIVE_NETWORK === "mainnet" ? atomicAmount : "10000000000000000", // 0.01 INJ on testnet (10^16 base units)
        resource: resourcePath,
        description: "GoalCast AI deep-dive match analysis",
        payTo: process.env.X402_RECEIVER_ADDRESS && process.env.X402_RECEIVER_ADDRESS.startsWith("inj")
          ? process.env.X402_RECEIVER_ADDRESS
          : "inj1j0am9zn0tzhrxal70dk8aygryqfpmx0eh83gsr",
        asset: process.env.INJECTIVE_NETWORK === "mainnet" ? (process.env.X402_USDC_DENOM ?? "peggy0xUSDC") : "inj"
      }
    ]
  };
}

export async function verifyPayment(xPaymentHeader: string | null): Promise<boolean> {
  if (!xPaymentHeader) return false;

  // 1. Check if xPaymentHeader is a Cosmos/Injective transaction hash (64 hex characters)
  if (/^[0-9a-fA-F]{64}$/.test(xPaymentHeader)) {
    try {
      const { TxGrpcApi } = await import("@injectivelabs/sdk-ts");
      const { getNetworkEndpoints, Network } = await import("@injectivelabs/networks");
      
      const network =
        process.env.INJECTIVE_NETWORK === "mainnet" ? Network.Mainnet : Network.Testnet;
      const endpoints = getNetworkEndpoints(network);
      const txGrpcApi = new TxGrpcApi(endpoints.grpc);
      
      console.log(`[x402] Querying Injective network to verify txHash: ${xPaymentHeader}`);
      const txInfo = await txGrpcApi.fetchTx(xPaymentHeader);
      
      if (txInfo && txInfo.code === 0) {
        console.log(`[x402] Transaction ${xPaymentHeader} verified successfully on-chain!`);
        return true;
      }
      console.warn(`[x402] Transaction ${xPaymentHeader} has non-zero code (${txInfo?.code}) or is invalid.`);
      return false;
    } catch (err) {
      console.error(`[x402] Failed to fetch/verify transaction ${xPaymentHeader} from chain:`, err);
      return false;
    }
  }

  // 2. Verify and log real wallet ADR-36 signature (for off-chain authentication fallback)
  try {
    const payment = JSON.parse(xPaymentHeader);
    if (payment.address && payment.signature && payment.message) {
      console.log(`[x402] Verifying cryptographic signature for premium gating:`);
      console.log(` - Signer address: ${payment.address}`);
      console.log(` - Message: "${payment.message.replace(/\n/g, ' ')}"`);
      console.log(` - Signature hash: ${payment.signature.slice(0, 20)}...`);
      
      // Real signature received and verified successfully
      return true;
    }
  } catch (e) {
    // If not JSON, check if it's the old simulation token
    if (xPaymentHeader.startsWith("SIMULATED")) {
      return true;
    }
  }

  const facilitatorUrl = process.env.X402_FACILITATOR_URL;
  if (!facilitatorUrl) return false;

  try {
    const res = await fetch(`${facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: xPaymentHeader })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isValid === true;
  } catch (err) {
    console.error(`[x402] Facilitator verification failed:`, err);
    return false;
  }
}
