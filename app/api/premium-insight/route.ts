import { NextRequest, NextResponse } from "next/server";
import { buildPaymentChallenge, verifyPayment } from "@/lib/x402";
import { openRouterChat } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  const xPayment = req.headers.get("X-PAYMENT");
  const paid = await verifyPayment(xPayment);

  if (!paid) {
    // Standard x402 handshake: tell the client exactly what to pay and where.
    return NextResponse.json(buildPaymentChallenge("/api/premium-insight"), { status: 402 });
  }

  const { matchContext } = await req.json();

  try {
    const deepDive = await openRouterChat(
      [
        {
          role: "system",
          content:
            "You write the PAID deep-dive tier for GoalCast: minute-by-minute momentum expectation, set-piece threat rating for both sides, and how this compares to the pool's crowd prediction split. Be concrete and specific, not generic hype.",
        },
        { role: "user", content: `Match context: ${JSON.stringify(matchContext)}` },
      ],
      600
    );
    return NextResponse.json({ deepDive });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deep-dive request failed" },
      { status: 500 }
    );
  }
}
