const { 
  ChainGrpcAuthApi, 
  MsgSend, 
  createTransaction,
  TxGrpcApi
} = require("@injectivelabs/sdk-ts");
const { getNetworkEndpoints, Network } = require("@injectivelabs/networks");

async function run() {
  try {
    const endpoints = getNetworkEndpoints(Network.Testnet);
    const authApi = new ChainGrpcAuthApi(endpoints.grpc);
    
    // Use a random valid address to test querying
    const address = "inj1vzz70gewfxc5gvfvndhq6u5e0q0vx270yg43l8";
    console.log("Fetching account details for:", address);
    const accountInfo = await authApi.fetchAccount(address);
    const baseAccount = accountInfo.baseAccount || accountInfo;
    console.log("Account info retrieved successfully!");
    console.log("Account Number:", baseAccount.accountNumber);
    console.log("Sequence:", baseAccount.sequence);
    
    // Try building a MsgSend
    const msg = MsgSend.fromJSON({
      amount: {
        denom: "inj",
        amount: "1000000"
      },
      srcInjectiveAddress: address,
      dstInjectiveAddress: address
    });
    console.log("MsgSend constructed successfully!");
    
    // Try creating a transaction object
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
    console.log("Transaction created successfully!");
    console.log("SignDoc properties:", Object.keys(tx.signDoc));
  } catch (e) {
    console.error("Test failed with error:", e);
  }
}

run();
