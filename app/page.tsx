"use client";

import { useState, useEffect } from "react";
import MatchCard, { Match } from "@/components/MatchCard";
import WalletConnect from "@/components/WalletConnect";

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch("/api/fixtures");
        if (!res.ok) throw new Error("Failed to fetch match fixtures");
        const data = await res.json();
        // Sort matches by kickoff date descending (newest / future matches first)
        const sorted = data.sort(
          (a: Match, b: Match) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()
        );
        setMatches(sorted);
        setError(null);
      } catch (err) {
        console.error("Failed to update match fixtures:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadMatches();

    // Polling real-time setiap 15 detik
    const interval = setInterval(loadMatches, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="pitch-field min-h-screen">
      <header className="mx-auto flex max-w-12xl items-center justify-between px-6 py-6">
        <div>
          <p className="mono-tag text-xs text-signal">INJECTIVE GLOBAL CUP</p>
          <h1 className="font-display text-2xl font-bold">GoalCast</h1>
        </div>
        <WalletConnect />
      </header>

      <section className="mx-auto max-w-12xl px-6 pb-4">
        <h2 className="font-display text-3xl font-bold leading-tight">
          Read the match.
          <br />
          <span className="text-flare">Predictions recorded on Injective.</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm text-chalk/60">
          AI analyst with specialized World Cup Agent Skills, fan predictions stored
          on-chain via Injective MCP Server, premium deep-dives via x402, and
          cross-chain USDC top-ups via CCTP.
        </p>
      </section>

      {loading && matches.length === 0 ? (
        <section className="mx-auto max-w-12xl px-6 py-12 text-center">
          <p className="mono-tag text-sm text-chalk/40 animate-pulse">Loading real-time data...</p>
        </section>
      ) : error && matches.length === 0 ? (
        <section className="mx-auto max-w-5xl px-6 py-12 text-center text-red-500">
          <p className="text-sm">{error}</p>
        </section>
      ) : (
        <section className="mx-auto grid max-w-12xl gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>
      )}

      <footer className="mx-auto text-center px-6 pb-10 pt-6 text-xs text-chalk/30">
        Built for The Injective Global Cup — x402 · CCTP · MCP Server · Agent Skills
      </footer>
    </main>
  );
}
