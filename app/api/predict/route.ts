import { NextRequest, NextResponse } from "next/server";
import { registerPredictionViaMcp, getPoolStatusViaMcp, PredictionInput } from "@/lib/injective";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PredictionInput;

    if (!body.matchId || !body.predictedOutcome || !body.injectiveAddress) {
      return NextResponse.json({ error: "matchId, predictedOutcome, injectiveAddress required" }, { status: 400 });
    }

    const result = await registerPredictionViaMcp(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in predict API POST route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register prediction" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) {
      return NextResponse.json({ error: "matchId query param required" }, { status: 400 });
    }
    const status = await getPoolStatusViaMcp(matchId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error in predict API GET route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pool status" },
      { status: 500 }
    );
  }
}
