"use client";

import { useState, useEffect } from "react";

// Extend window interface for Keplr and Leap
declare global {
  interface Window {
    keplr?: any;
    leap?: any;
  }
}

const INJECTIVE_TESTNET_CONFIG = {
  chainId: "injective-888",
  chainName: "Injective Testnet",
  rpc: "https://testnet.sentry.tm.injective.network:443",
  rest: "https://testnet.lcd.injective.network:443",
  bip44: {
    coinType: 60
  },
  bech32Config: {
    bech32PrefixAccAddr: "inj",
    bech32PrefixAccPub: "injpub",
    bech32PrefixValAddr: "injvaloper",
    bech32PrefixValPub: "injvaloperpub",
    bech32PrefixConsAddr: "injvalcons",
    bech32PrefixConsPub: "injvalconspub"
  },
  currencies: [
    {
      coinDenom: "INJ",
      coinMinimalDenom: "inj",
      coinDecimals: 18,
      coinGeckoId: "injective-protocol"
    }
  ],
  feeCurrencies: [
    {
      coinDenom: "INJ",
      coinMinimalDenom: "inj",
      coinDecimals: 18,
      coinGeckoId: "injective-protocol",
      gasPriceStep: {
        low: 0.0005,
        average: 0.0007,
        high: 0.0009
      }
    }
  ],
  stakeCurrency: {
    coinDenom: "INJ",
    coinMinimalDenom: "inj",
    coinDecimals: 18,
    coinGeckoId: "injective-protocol"
  },
  features: ["ibc-transfer", "ibc-go", "eth-key-sign"]
};

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAddress(localStorage.getItem("inj_wallet_address"));

      const handleStorage = () => {
        setAddress(localStorage.getItem("inj_wallet_address"));
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, []);

  async function connect(provider: "keplr" | "leap") {
    setLoading(true);
    setError(null);
    try {
      const wallet = provider === "keplr" ? window.keplr : window.leap;
      if (!wallet) {
        throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} extension not found. Please install it first.`);
      }

      const chainId = "injective-888";

      // 1. Suggest chain to wallet if needed
      try {
        await wallet.experimentalSuggestChain(INJECTIVE_TESTNET_CONFIG);
      } catch (err) {
        console.warn("Chain suggestion skipped or failed:", err);
      }

      // 2. Enable wallet
      await wallet.enable(chainId);

      // 3. Get address
      const offlineSigner = wallet.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found in your wallet.");
      }
      const userAddress = accounts[0].address;

      // 4. Request welcome signature (proof of ownership)
      const welcomeMsg = `Welcome to GoalCast!\n\nSign this message to verify your address for real-time predictions and premium access.\n\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;
      
      const signResult = await wallet.signArbitrary(chainId, userAddress, welcomeMsg);
      if (!signResult || !signResult.signature) {
        throw new Error("Connection cancelled: signature required.");
      }

      // 5. Store in localStorage
      localStorage.setItem("inj_wallet_address", userAddress);
      localStorage.setItem("inj_wallet_provider", provider);
      localStorage.setItem("inj_wallet_signature", signResult.signature);
      localStorage.setItem("inj_wallet_pubkey", JSON.stringify(signResult.pub_key));

      setAddress(userAddress);
      window.dispatchEvent(new Event("storage"));
      setShowModal(false);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    localStorage.removeItem("inj_wallet_address");
    localStorage.removeItem("inj_wallet_provider");
    localStorage.removeItem("inj_wallet_signature");
    localStorage.removeItem("inj_wallet_pubkey");
    setAddress(null);
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <>
      {address ? (
        <button
          onClick={disconnect}
          title="Click to disconnect wallet"
          className="mono-tag rounded-full border border-signal/40 bg-[#0E241A] px-3.5 py-1.5 text-xs text-signal hover:bg-signal/15 hover:border-signal/70 transition-all cursor-pointer font-mono"
        >
          {address.slice(0, 7)}...{address.slice(-6)} (Disconnect)
        </button>
      ) : (
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="rounded-full bg-flare px-4 py-1.5 text-sm font-semibold text-pitch transition-all hover:scale-105 active:scale-95 shadow-md shadow-flare/10 cursor-pointer"
        >
          Connect Wallet
        </button>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-pitchLine bg-[#0E241A] p-6 shadow-2xl shadow-flare/5">
            <div className="flex items-center justify-between mb-4 border-b border-pitchLine/50 pb-3">
              <h3 className="font-display font-bold text-flare text-sm">Select Injective Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-chalk/40 hover:text-chalk/80 text-xs transition-colors cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-chalk/60 mb-5 leading-relaxed">
              Connect your Cosmos wallet to interact with on-chain prediction pools and unlock premium content on Injective.
            </p>

            <div className="space-y-3">
              {/* Keplr Button */}
              <button
                onClick={() => connect("keplr")}
                disabled={loading}
                className="w-full flex items-center justify-between rounded-lg border border-pitchLine bg-pitch/40 px-4 py-3 text-xs font-semibold text-chalk hover:border-signal/50 hover:bg-signal/5 transition-all disabled:opacity-40 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌌</span>
                  <span>Keplr Wallet</span>
                </div>
                <span className="text-[10px] text-signal opacity-0 group-hover:opacity-100 transition-opacity">Connect →</span>
              </button>

              {/* Leap Button */}
              <button
                onClick={() => connect("leap")}
                disabled={loading}
                className="w-full flex items-center justify-between rounded-lg border border-pitchLine bg-pitch/40 px-4 py-3 text-xs font-semibold text-chalk hover:border-signal/50 hover:bg-signal/5 transition-all disabled:opacity-40 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🐸</span>
                  <span>Leap Wallet</span>
                </div>
                <span className="text-[10px] text-signal opacity-0 group-hover:opacity-100 transition-opacity">Connect →</span>
              </button>
            </div>

            {loading && (
              <div className="mt-4 text-center">
                <span className="inline-block animate-pulse text-[10px] font-semibold text-signal uppercase tracking-wider">
                  Waiting for wallet confirmation...
                </span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-clay/15 border border-clay/30 p-2.5 text-center text-xs text-clay">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
