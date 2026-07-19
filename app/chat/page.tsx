"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Match } from "@/components/MatchCard";
import WalletConnect from "@/components/WalletConnect";

type ChatMsg = { role: "user" | "assistant"; content: string };

function renderInline(text: string) {
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-flare">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-chalk/80">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormatMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];
  let currentParagraphLines: string[] = [];
  let keyCounter = 0;

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join("\n");
      elements.push(
        <p key={`p-${keyCounter++}`} className="leading-relaxed text-chalk/90 text-sm mb-2">
          {renderInline(paragraphText)}
        </p>
      );
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc pl-5 my-2 space-y-1 marker:text-flare">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 1. Empty lines trigger flushes
    if (trimmedLine === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // 2. Headings (e.g. #, ##, ###, ####)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const headerClasses = 
        level === 1 ? "font-display text-base font-bold text-flare mt-3 mb-2" :
        level === 2 ? "font-display text-sm font-bold text-flare mt-2.5 mb-1.5" :
        "font-display text-xs font-semibold text-flare/90 mt-2 mb-1.5";
      
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as keyof JSX.IntrinsicElements;
      elements.push(
        <Tag key={`h-${keyCounter++}`} className={headerClasses}>
          {renderInline(headerText)}
        </Tag>
      );
      continue;
    }

    // 3. Blockquotes (e.g. > blockquote)
    const quoteMatch = line.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      const quoteText = quoteMatch[1];
      elements.push(
        <blockquote key={`q-${keyCounter++}`} className="border-l-2 border-flare/40 pl-3 italic my-2 text-chalk/80 text-sm">
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // 4. List items (e.g. * item or - item)
    const listMatch = line.match(/^\s*[\*\-]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      const content = listMatch[1];
      currentListItems.push(
        <li key={`li-${keyCounter++}`} className="text-chalk/90 text-sm leading-relaxed">
          {renderInline(content)}
        </li>
      );
      continue;
    }

    // Numbered list item (e.g. 1. item)
    const numListMatch = line.match(/^\s*(\d+\.)\s+(.*)$/);
    if (numListMatch) {
      flushParagraph();
      const numPrefix = numListMatch[1];
      const content = numListMatch[2];
      currentListItems.push(
        <li key={`li-${keyCounter++}`} className="text-chalk/90 text-sm leading-relaxed list-none pl-1">
          <span className="text-flare mr-1.5 font-semibold font-mono">{numPrefix}</span>
          {renderInline(content)}
        </li>
      );
      continue;
    }

    // 5. Fallback: accumulating paragraph lines
    flushList();
    currentParagraphLines.push(line);
  }

  // Final flushes
  flushParagraph();
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

async function safeParseJson(res: Response, fallbackMsg: string) {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (err) {
      // Fall through to text parsing
    }
  }
  try {
    const text = await res.text();
    throw new Error(`${fallbackMsg} (Status ${res.status}): ${text.slice(0, 150) || "Empty response"}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes(fallbackMsg)) {
      throw err;
    }
    throw new Error(`${fallbackMsg} (Status ${res.status})`);
  }
}

function ChatContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const predictMode = searchParams.get("predict") === "1";

  const [matchContext, setMatchContext] = useState<Match | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deepDive, setDeepDive] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Wallet and Prediction States
  const [address, setAddress] = useState<string | null>(null);
  const [predictedOutcome, setPredictedOutcome] = useState<"HOME" | "DRAW" | "AWAY" | null>(null);
  const [confidence, setConfidence] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [customAddress, setCustomAddress] = useState("");
  const [predictStatus, setPredictStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS" | "FAILED">("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync wallet address from localStorage
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

  // Customize welcome message based on mode
  useEffect(() => {
    if (matchContext) {
      if (predictMode) {
        setMessages([
          {
            role: "assistant",
            content: `🔮 **Welcome to the On-chain Prediction Portal!**\n\nYou are predicting the **${matchContext.home} vs ${matchContext.away}** match. Use the widget below to choose your predicted outcome, set your confidence level, and submit to the Injective smart contract pool.\n\nNeed advice first? Ask me anything about their tactical matchups or head-to-head records below!`
          }
        ]);
      } else {
        setMessages([
          {
            role: "assistant",
            content: `⚽ **Welcome to the AI Match Analyst!**\n\nI am ready to analyze the **${matchContext.home} vs ${matchContext.away}** fixture. Ask me about tactical form, key defensive matchups, player injuries, or request a paid deep-dive premium insight below!`
          }
        ]);
      }
    } else {
      setMessages([
        {
          role: "assistant",
          content: "Hello! Ask anything about this World Cup match — team form, key matchups, or request prediction pool guidance."
        }
      ]);
    }
  }, [matchContext, predictMode]);

  useEffect(() => {
    if (matchId) {
      fetch(`/api/fixtures?id=${matchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setMatchContext(data);
          }
        })
        .catch((err) => console.error("Error loading match context:", err));
    }
  }, [matchId]);

  async function send() {
    if (!input.trim()) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next, matchContext })
    });
    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  async function unlockDeepDive() {
    if (!matchContext) return;
    
    const walletAddress = address || customAddress.trim();
    if (!walletAddress) {
      alert("Please connect your wallet or enter an Injective address first.");
      return;
    }

    setUnlocking(true);
    try {
      // Simulation bypass flow
      if (walletAddress.toUpperCase().startsWith("SIMULATED")) {
        const retry = await fetch("/api/premium-insight", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "X-PAYMENT": walletAddress
          },
          body: JSON.stringify({ matchContext })
        });

        if (!retry.ok) {
          await safeParseJson(retry, "Failed to verify premium insight payment on-chain");
        }

        const data = await safeParseJson(retry, "Failed to parse premium insight");
        setDeepDive(data.deepDive);
        return;
      }

      // 1st call: expect 402, read the payment challenge.
      const first = await fetch("/api/premium-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchContext })
      });

      if (first.status === 402) {
        const challenge = await safeParseJson(first, "Failed to read payment challenge");
        
        // Retrieve connected wallet provider
        const provider = localStorage.getItem("inj_wallet_provider") || "keplr";
        const wallet = provider === "leap" ? window.leap : window.keplr;
        if (!wallet) {
          throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} wallet not found. Cannot sign payment.`);
        }

        const chainId = "injective-888";
        
        // Get user's public key from the connected wallet
        const keyInfo = await wallet.getKey(chainId);
        const base64PubKey = btoa(
          String.fromCharCode.apply(null, Array.from(keyInfo.pubKey))
        );

        // Fetch prepared transaction from the backend
        const prepareRes = await fetch("/api/premium-insight/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender: walletAddress, pubKey: base64PubKey })
        });
        if (!prepareRes.ok) {
          await safeParseJson(prepareRes, "Failed to prepare transaction");
        }
        const { bodyBytes, authInfoBytes, accountNumber, sequence } = await safeParseJson(prepareRes, "Failed to parse prepared transaction");

        // Hex to Uint8Array helper
        const hexToBytes = (hex: string) => {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
          }
          return bytes;
        };

        // Sign the real on-chain transaction via wallet signDirect (Protobuf)
        const signDoc = {
          bodyBytes: hexToBytes(bodyBytes),
          authInfoBytes: hexToBytes(authInfoBytes),
          chainId,
          accountNumber: (accountNumber || "0").toString()
        };

        console.log(`[x402] Prompting wallet to sign real transaction:`, signDoc);
        const signResult = await wallet.signDirect(chainId, walletAddress, signDoc);
        if (!signResult || !signResult.signature) {
          throw new Error("Payment transaction cancelled by user.");
        }

        // Uint8Array to Hex helper
        const bytesToHex = (bytes: Uint8Array) => {
          return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        };

        // Broadcast the signed transaction via backend
        const broadcastRes = await fetch("/api/premium-insight/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signed: {
              bodyBytes: bytesToHex(signResult.signed.bodyBytes),
              authInfoBytes: bytesToHex(signResult.signed.authInfoBytes),
              chainId: signResult.signed.chainId,
              accountNumber: signResult.signed.accountNumber
            },
            signature: {
              pub_key: signResult.signature.pub_key,
              signature: signResult.signature.signature
            }
          })
        });

        if (!broadcastRes.ok) {
          await safeParseJson(broadcastRes, "Transaction broadcast failed");
        }

        const { txHash } = await safeParseJson(broadcastRes, "Failed to parse broadcast response");
        console.log(`[x402] On-chain transaction broadcasted successfully. TxHash: ${txHash}`);

        // Retry the request with the real txHash in the X-PAYMENT header
        const retry = await fetch("/api/premium-insight", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "X-PAYMENT": txHash
          },
          body: JSON.stringify({ matchContext })
        });

        if (!retry.ok) {
          await safeParseJson(retry, "Failed to verify premium insight payment on-chain");
        }

        const data = await safeParseJson(retry, "Failed to parse premium insight");
        setDeepDive(data.deepDive ?? JSON.stringify(challenge));
      } else if (first.ok) {
        const data = await safeParseJson(first, "Failed to parse premium insight");
        setDeepDive(data.deepDive);
      } else {
        await safeParseJson(first, "Failed to request premium insight");
      }
    } catch (err) {
      console.error("Failed to unlock deep dive:", err);
      alert(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setUnlocking(false);
    }
  }

  async function submitPrediction() {
    if (!matchContext || !predictedOutcome) return;

    const walletAddress = address || customAddress.trim();
    if (!walletAddress) {
      setErrorMsg("Please connect your wallet or enter an Injective address first.");
      return;
    }

    setPredictStatus("SUBMITTING");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: matchContext.id,
          predictedOutcome,
          confidence,
          injectiveAddress: walletAddress
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to submit prediction");
      }

      setTxHash(data.txHash);
      setPredictStatus("SUCCESS");

      // Post confirmation in the chat
      const outcomeText = 
        predictedOutcome === "HOME" ? matchContext.home :
        predictedOutcome === "AWAY" ? matchContext.away :
        "a Draw";

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 **Prediction registered on-chain successfully!**\n\n* **Outcome:** ${outcomeText}\n* **Confidence:** ${confidence}\n* **Injective Account:** \`${walletAddress}\`\n* **Transaction Hash:** \`${data.txHash}\`\n\nYour prediction has been logged into the smart contract pool. Good luck!`
        }
      ]);
    } catch (err) {
      console.error("Prediction submission error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
      setPredictStatus("FAILED");
    }
  }

  return (
    <main className="pitch-field flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-2xl px-6 py-6 flex items-center justify-between">
        <div>
          <a href="/" className="mono-tag text-xs text-signal">← DASHBOARD</a>
          <h1 className="font-display text-2xl font-bold">
            {predictMode ? "On-chain Prediction" : "AI Match Analyst"}
          </h1>
        </div>
        <WalletConnect />
      </header>

      {matchContext && (
        <section className="mx-auto w-full max-w-2xl px-6 mb-4">
          <div className="flex items-center gap-2 text-sm text-chalk/80 bg-[#0E241A] p-3 rounded-lg border border-pitchLine/40">
            {matchContext.homeFlag.startsWith("http") ? (
              <img src={matchContext.homeFlag} alt={matchContext.home} className="h-5 w-5 object-contain" />
            ) : (
              <span>{matchContext.homeFlag}</span>
            )}
            <span className="font-semibold">{matchContext.home}</span>
            <span className="text-flare font-bold">
              {matchContext.score ? `${matchContext.score.home} – ${matchContext.score.away}` : "vs"}
            </span>
            <span className="font-semibold">{matchContext.away}</span>
            {matchContext.awayFlag.startsWith("http") ? (
              <img src={matchContext.awayFlag} alt={matchContext.away} className="h-5 w-5 object-contain" />
            ) : (
              <span>{matchContext.awayFlag}</span>
            )}
            <span className="mono-tag text-[10px] text-chalk/40 ml-auto">
              {matchContext.stage} · {matchContext.status}
            </span>
          </div>
        </section>
      )}

      {predictMode && matchContext && (
        <section className="mx-auto w-full max-w-2xl px-6 mb-4">
          <div className="rounded-xl border border-flare/30 bg-[#0E241A] p-5 shadow-lg shadow-flare/5">
            <h2 className="font-display text-sm font-bold text-flare flex items-center gap-2 mb-3">
              <span>🔮</span> Injective Fan Prediction Pool
            </h2>
            
            {predictStatus === "SUCCESS" ? (
              <div className="rounded-lg bg-signal/15 border border-signal/30 p-4 text-center">
                <span className="text-2xl">🎉</span>
                <h3 className="font-semibold text-signal mt-1">Prediction Submitted!</h3>
                <p className="text-xs text-chalk/75 mt-1">
                  Your prediction has been successfully registered on Injective.
                </p>
                <div className="mt-3 bg-pitch p-2 rounded text-xs font-mono break-all text-chalk/60 border border-pitchLine select-all">
                  Tx: {txHash}
                </div>
                <button
                  onClick={() => {
                    setPredictStatus("IDLE");
                    setPredictedOutcome(null);
                    setTxHash(null);
                  }}
                  className="mt-3 text-xs text-flare underline hover:text-flare/80 cursor-pointer"
                >
                  Make another prediction
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Outcome Selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-chalk/50 uppercase tracking-wider mb-2">
                    Predict the Outcome
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPredictedOutcome("HOME")}
                      className={`rounded-lg border py-2.5 px-1 text-xs font-semibold transition-all cursor-pointer ${
                        predictedOutcome === "HOME"
                          ? "bg-signal/20 text-signal border-signal"
                          : "border-pitchLine bg-pitch/40 text-chalk/60 hover:border-chalk/30"
                      }`}
                    >
                      <span className="block truncate">{matchContext.home}</span>
                      <span className="block text-[9px] opacity-70 mt-0.5">Home Win</span>
                    </button>
                    <button
                      onClick={() => setPredictedOutcome("DRAW")}
                      className={`rounded-lg border py-2.5 px-1 text-xs font-semibold transition-all cursor-pointer ${
                        predictedOutcome === "DRAW"
                          ? "bg-signal/20 text-signal border-signal"
                          : "border-pitchLine bg-pitch/40 text-chalk/60 hover:border-chalk/30"
                      }`}
                    >
                      <span className="block">Draw</span>
                      <span className="block text-[9px] opacity-70 mt-0.5">Tie Match</span>
                    </button>
                    <button
                      onClick={() => setPredictedOutcome("AWAY")}
                      className={`rounded-lg border py-2.5 px-1 text-xs font-semibold transition-all cursor-pointer ${
                        predictedOutcome === "AWAY"
                          ? "bg-signal/20 text-signal border-signal"
                          : "border-pitchLine bg-pitch/40 text-chalk/60 hover:border-chalk/30"
                      }`}
                    >
                      <span className="block truncate">{matchContext.away}</span>
                      <span className="block text-[9px] opacity-70 mt-0.5">Away Win</span>
                    </button>
                  </div>
                </div>

                {/* 2. Confidence Selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-chalk/50 uppercase tracking-wider mb-2">
                    Confidence Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setConfidence(level)}
                        className={`rounded-lg border py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          confidence === level
                            ? "bg-flare/20 text-flare border-flare"
                            : "border-pitchLine bg-pitch/40 text-chalk/60 hover:border-chalk/30"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Injective Address */}
                <div>
                  <label className="block text-[10px] font-semibold text-chalk/50 uppercase tracking-wider mb-1.5">
                    Your Injective Wallet
                  </label>
                  {address ? (
                    <div className="flex items-center justify-between rounded-lg border border-pitchLine bg-pitch/60 px-3 py-2 text-xs">
                      <span className="font-mono text-signal">{address}</span>
                      <span className="text-[10px] text-chalk/40">(Connected)</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Enter Injective address (e.g. inj1...)"
                      className="w-full rounded-lg border border-pitchLine bg-pitch/60 px-3 py-2 text-xs text-chalk outline-none focus:border-flare font-mono"
                    />
                  )}
                </div>

                {/* Submit button & errors */}
                {errorMsg && (
                  <p className="text-xs text-clay font-medium">{errorMsg}</p>
                )}

                <button
                  onClick={submitPrediction}
                  disabled={predictStatus === "SUBMITTING" || !predictedOutcome}
                  className="w-full rounded-lg bg-flare py-2.5 text-sm font-semibold text-pitch hover:bg-flare/90 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {predictStatus === "SUBMITTING"
                    ? "Submitting prediction..."
                    : "Submit Prediction to Injective Pool"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto max-w-[80%] bg-signal/15 text-chalk"
                : "mr-auto max-w-[85%] bg-[#0E241A] text-chalk/90"
            }`}
          >
            <FormatMarkdown text={m.content} />
          </div>
        ))}
        {loading && <p className="mono-tag text-xs text-chalk/40">Analyzing...</p>}
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 py-4">
        <button
          onClick={unlockDeepDive}
          disabled={unlocking}
          className="mb-3 w-full rounded-lg border border-flare/40 px-4 py-2 text-sm font-medium text-flare hover:bg-flare/10 disabled:opacity-50 cursor-pointer"
        >
          {unlocking ? "Processing x402 payment..." : "Unlock Premium Deep-Dive ($0.05 USDC)"}
        </button>
        {deepDive && (
          <div className="mb-3 rounded-lg border border-flare/20 bg-flare/5 p-3 text-sm text-chalk/90">
            <FormatMarkdown text={deepDive} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about the match..."
            className="flex-1 rounded-lg border border-pitchLine bg-[#0E241A] px-4 py-2 text-sm outline-none focus:border-signal"
          />
          <button
            onClick={send}
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-pitch cursor-pointer"
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <main className="pitch-field flex min-h-screen flex-col items-center justify-center">
        <p className="mono-tag text-sm text-chalk/50">Loading chat session...</p>
      </main>
    }>
      <ChatContent />
    </Suspense>
  );
}
