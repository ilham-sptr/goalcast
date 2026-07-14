import {
  ChainGrpcWasmApi,
  MsgExecuteContractCompat,
  MsgBroadcasterWithPk,
  PrivateKey,
} from "@injectivelabs/sdk-ts";
import { getNetworkEndpoints, Network } from "@injectivelabs/networks";

const network =
  process.env.INJECTIVE_NETWORK === "mainnet" ? Network.Mainnet : Network.Testnet;
const endpoints = getNetworkEndpoints(network);
const contractAddress = process.env.PREDICTION_POOL_CONTRACT_ADDRESS ?? "";

const wasmApi = new ChainGrpcWasmApi(endpoints.grpc);

function requirePrivateKey(): PrivateKey {
  const raw = process.env.INJECTIVE_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "INJECTIVE_PRIVATE_KEY is not set — the MCP server needs a testnet wallet to sign RegisterPrediction txs."
    );
  }
  return PrivateKey.fromHex(raw.startsWith("0x") ? raw : `0x${raw}`);
}

/** Smart-query the contract. Read-only, no signing needed. */
export async function queryContract<T = unknown>(queryMsg: Record<string, unknown>): Promise<T> {
  if (!contractAddress) {
    throw new Error("PREDICTION_POOL_CONTRACT_ADDRESS is not set");
  }
  const base64Query = Buffer.from(JSON.stringify(queryMsg)).toString("base64");
  const response = await wasmApi.fetchSmartContractState(contractAddress, base64Query);
  const bytes = response.data as unknown as Uint8Array;
  return JSON.parse(Buffer.from(bytes).toString("utf-8")) as T;
}

export type RegisterPredictionArgs = {
  matchId: string;
  outcome: "home" | "draw" | "away";
};

/**
 * Executes RegisterPrediction on-chain, signed by the MCP server's own
 * wallet. NOTE: in this MVP the MCP server signs on behalf of whichever
 * caller invokes the tool — good enough for a hackathon demo where one
 * server wallet submits predictions, but before any real usage you'd want
 * the *fan's own* wallet signing client-side instead (see README "Known
 * limitation" section).
 */
export async function executeRegisterPrediction(args: RegisterPredictionArgs) {
  if (!contractAddress) {
    throw new Error("PREDICTION_POOL_CONTRACT_ADDRESS is not set");
  }
  const privateKey = requirePrivateKey();
  const injectiveAddress = privateKey.toBech32();

  const msg = MsgExecuteContractCompat.fromJSON({
    sender: injectiveAddress,
    contractAddress,
    msg: {
      register_prediction: {
        match_id: args.matchId,
        outcome: args.outcome,
      },
    },
  });

  const broadcaster = new MsgBroadcasterWithPk({
    privateKey,
    network,
  });

  const txResponse = await broadcaster.broadcast({ msgs: msg });
  return {
    txHash: txResponse.txHash,
    injectiveAddress,
  };
}
