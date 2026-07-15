try {
  const sdk = require("@injectivelabs/sdk-ts");
  console.log("sdk-ts imported successfully!");
  console.log("MsgBroadcaster exists:", !!sdk.MsgBroadcaster);
  console.log("MsgSend exists:", !!sdk.MsgSend);
} catch (e) {
  console.error("sdk-ts failed:", e.message);
}

try {
  const walletTs = require("@injectivelabs/wallet-ts");
  console.log("wallet-ts imported successfully!");
  console.log("WalletStrategy exists:", !!walletTs.WalletStrategy);
  console.log("Wallet exists in wallet-ts:", !!walletTs.Wallet);
} catch (e) {
  console.error("wallet-ts failed:", e.message);
}

try {
  const walletBase = require("@injectivelabs/wallet-base");
  console.log("wallet-base imported successfully!");
  console.log("Wallet exists in wallet-base:", !!walletBase.Wallet);
} catch (e) {
  console.error("wallet-base failed:", e.message);
}
