const { PrivateKey } = require("@injectivelabs/sdk-ts");

const key = "968d0bc8c8b88310819c0fef22c761230049e19625d16f052319a1c5289f19bd";
const privateKey = PrivateKey.fromHex(key);
console.log("Derived Injective address:", privateKey.toBech32());
