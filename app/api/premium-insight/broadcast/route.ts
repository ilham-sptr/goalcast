import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { signed, signature } = await req.json();

    if (!signed || !signature) {
      return NextResponse.json(
        { error: "signed transaction and signature properties are required" },
        { status: 400 }
      );
    }

    const { TxGrpcApi, createTxRawFromSigResponse } = await import("@injectivelabs/sdk-ts");
    const { getNetworkEndpoints, Network } = await import("@injectivelabs/networks");

    // 1. Reconstruct the direct sign response payload (converting hex strings back to Uint8Arrays)
    const directSignResponse = {
      signed: {
        bodyBytes: new Uint8Array(Buffer.from(signed.bodyBytes, "hex")),
        authInfoBytes: new Uint8Array(Buffer.from(signed.authInfoBytes, "hex")),
        chainId: signed.chainId,
        accountNumber: signed.accountNumber
      },
      signature: {
        pub_key: signature.pub_key,
        signature: signature.signature
      }
    };

    // 2. Assemble the TxRaw protobuf payload
    const txRaw = createTxRawFromSigResponse(directSignResponse);

    // 3. Initialize TxGrpcApi and broadcast
    const network =
      process.env.INJECTIVE_NETWORK === "mainnet" ? Network.Mainnet : Network.Testnet;
    const endpoints = getNetworkEndpoints(network);
    const txGrpcApi = new TxGrpcApi(endpoints.grpc);

    console.log(`[x402] Broadcasting transaction for signer: ${signature.pub_key?.value || "unknown"}`);
    const txResponse = await txGrpcApi.broadcast(txRaw);

    if (!txResponse || txResponse.code !== 0) {
      throw new Error(
        txResponse?.rawLog || `Transaction failed with code ${txResponse?.code}`
      );
    }

    console.log(`[x402] Transaction successfully broadcasted! Hash: ${txResponse.txHash}`);

    return NextResponse.json({ txHash: txResponse.txHash });
  } catch (err) {
    console.error("Failed to broadcast transaction on Injective:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to broadcast transaction" },
      { status: 500 }
    );
  }
}
