/**
 * Circle CCTP bridge helper — lets a fan deposit USDC from Ethereum/Base/Arbitrum
 * straight into their Injective address to fund Fan Prediction Pool entries,
 * without a manual third-party bridge.
 *
 * CCTP flow:
 *  1. Source chain: call `depositForBurn` on Circle's TokenMessenger contract,
 *     burning USDC and emitting a message.
 *  2. Fetch the attestation for that burn from Circle's Iris API.
 *  3. Destination chain (Injective): call `receiveMessage` with the message +
 *     attestation to mint native USDC to the user's Injective address.
 *
 * Domains (Circle CCTP domain IDs), for reference:
 *  0 = Ethereum, 1 = Avalanche, 2 = OP Mainnet, 3 = Arbitrum, 6 = Base,
 *  19 = Injective (Circle-assigned; confirm current value in Circle's docs
 *  before mainnet use, domain IDs are occasionally added/renumbered).
 */

const IRIS_API = "https://iris-api.circle.com/v1";

export async function getAttestation(sourceTxHash: string) {
  const res = await fetch(`${IRIS_API}/attestations/${sourceTxHash}`);
  if (!res.ok) {
    throw new Error(`CCTP attestation not ready yet for ${sourceTxHash}`);
  }
  return res.json() as Promise<{ status: "pending_confirmations" | "complete"; attestation?: string }>;
}

export type CctpDepositParams = {
  amountUsdc: number;
  destinationInjectiveAddress: string;
  sourceDomain: number; // e.g. 0 = Ethereum, 6 = Base
};

/**
 * Client-side helper: builds the calldata shape the frontend wallet needs to
 * sign for `depositForBurn`. Actual signing happens in the browser wallet
 * (wagmi/viem); this just centralizes the constants so the UI and docs agree.
 */
export function buildDepositForBurnArgs({
  amountUsdc,
  destinationInjectiveAddress,
  sourceDomain
}: CctpDepositParams) {
  const amount = BigInt(Math.round(amountUsdc * 1_000_000)); // USDC = 6 decimals
  const destinationDomain = Number(process.env.CCTP_DEST_DOMAIN ?? 19); // Injective
  return {
    amount,
    destinationDomain,
    sourceDomain,
    mintRecipient: destinationInjectiveAddress,
    tokenMessenger: process.env.CCTP_TOKEN_MESSENGER_ADDRESS
  };
}
