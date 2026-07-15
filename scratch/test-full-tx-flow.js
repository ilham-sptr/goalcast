const { 
  ChainGrpcAuthApi, 
  MsgSend, 
  createTransaction,
  createTxRawFromSigResponse,
  TxGrpcApi
} = require("@injectivelabs/sdk-ts");
const { getNetworkEndpoints, Network } = require("@injectivelabs/networks");

async function run() {
  try {
    const endpoints = getNetworkEndpoints(Network.Testnet);
    const authApi = new ChainGrpcAuthApi(endpoints.grpc);
    
    const address = "inj1vzz70gewfxc5gvfvndhq6u5e0q0vx270yg43l8";
    const accountInfo = await authApi.fetchAccount(address);
    const baseAccount = accountInfo.baseAccount || accountInfo;
    
    const msg = MsgSend.fromJSON({
      amount: { denom: "inj", amount: "1000" },
      srcInjectiveAddress: address,
      dstInjectiveAddress: address
    });
    
    const tx = createTransaction({
      pubKey: "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      chainId: "injective-888",
      message: msg,
      sequence: baseAccount.sequence,
      accountNumber: baseAccount.accountNumber,
      fee: {
        amount: [{ denom: "inj", amount: "50000000000000" }],
        gas: "200000"
      }
    });

    console.log("Tx created successfully!");

    // Construct mock direct sign response
    const mockResponse = {
      signed: {
        bodyBytes: tx.signDoc.bodyBytes,
        authInfoBytes: tx.signDoc.authInfoBytes,
        chainId: "injective-888",
        accountNumber: baseAccount.accountNumber.toString()
      },
      signature: {
        pub_key: {
          type: "tendermint/PubKeySecp256k1",
          value: "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        },
        signature: Buffer.from("signature").toString("base64")
      }
    };

    const txRaw = createTxRawFromSigResponse(mockResponse);
    console.log("TxRaw assembled successfully!");
    console.log("txRaw properties:", Object.keys(txRaw));

    const txGrpcApi = new TxGrpcApi(endpoints.grpc);
    console.log("TxGrpcApi instantiated!");
  } catch (e) {
    console.error("Test failed:", e);
  }
}

run();
