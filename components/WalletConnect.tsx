"use client";

import { useState, useEffect } from "react";

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

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

  async function connect() {
    setConnecting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const demoAddress = "inj1demo...4f2a";
      setAddress(demoAddress);
      localStorage.setItem("inj_wallet_address", demoAddress);
      window.dispatchEvent(new Event("storage"));
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setAddress(null);
    localStorage.removeItem("inj_wallet_address");
    window.dispatchEvent(new Event("storage"));
  }

  if (address) {
    return (
      <button
        onClick={disconnect}
        title="Click to disconnect"
        className="mono-tag rounded-full border border-signal/40 px-3 py-1.5 text-xs text-signal hover:bg-signal/15 hover:border-signal/60 transition-all cursor-pointer"
      >
        {address}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="rounded-full bg-flare px-4 py-1.5 text-sm font-semibold text-pitch transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
