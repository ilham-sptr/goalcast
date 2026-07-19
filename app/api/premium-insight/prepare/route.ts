import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sender, pubKey } = await req.json();

    if (!sender || !pubKey) {
      return NextResponse.json(
        { error: "Sender address and pubKey are required" },
        { status: 400 }
      );
    }

    const { ChainGrpcAuthApi, MsgSend, createTransaction } = await import("@injectivelabs/sdk-ts");
    const { getNetworkEndpoints, Network } = await import("@injectivelabs/networks");

    const network =
      process.env.INJECTIVE_NETWORK === "mainnet" ? Network.Mainnet : Network.Testnet;
    const endpoints = getNetworkEndpoints(network);
    const authApi = new ChainGrpcAuthApi(endpoints.grpc);

    // 1. Fetch account details from the chain
    const accountInfo = await authApi.fetchAccount(sender);
    const baseAccount = accountInfo.baseAccount || accountInfo;
    const sequence = baseAccount.sequence;
    const accountNumber = baseAccount.accountNumber;

    // 2. Define the recipient (fallback to server address if not set or EVM format)
    const recipient =
      process.env.X402_RECEIVER_ADDRESS && process.env.X402_RECEIVER_ADDRESS.startsWith("inj")
        ? process.env.X402_RECEIVER_ADDRESS
        : "inj1j0am9zn0tzhrxal70dk8aygryqfpmx0eh83gsr";

    // 3. Construct MsgSend to transfer 0.01 INJ (approx $0.05)
    // 0.01 INJ = 10^16 base units
    const msg = MsgSend.fromJSON({
      amount: {
        denom: "inj",
        amount: "10000000000000000"
      },
      srcInjectiveAddress: sender,
      dstInjectiveAddress: recipient
    });

    // 4. Create the Transaction object
    const tx = createTransaction({
      pubKey,
      chainId: network === Network.Mainnet ? "injective-1" : "injective-888",
      message: msg,
      sequence,
      accountNumber,
      fee: {
        amount: [{ denom: "inj", amount: "50000000000000" }],
        gas: "200000"
      }
    });

    // 5. Convert Uint8Arrays to hex strings for JSON transport
    const bodyBytesHex = Buffer.from(tx.signDoc.bodyBytes).toString("hex");
    const authInfoBytesHex = Buffer.from(tx.signDoc.authInfoBytes).toString("hex");

    return NextResponse.json({
      bodyBytes: bodyBytesHex,
      authInfoBytes: authInfoBytesHex,
      chainId: network === Network.Mainnet ? "injective-1" : "injective-888",
      accountNumber: accountNumber.toString()
    });
  } catch (err) {
    console.error("Failed to prepare x402 payment transaction:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to prepare transaction" },
      { status: 500 }
    );
  }
}
