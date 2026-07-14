import { NextRequest, NextResponse } from "next/server";
import { fetchFootballFixtures, getMock2026Matches, getMock2022Matches, getMock1994Matches } from "@/lib/football";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const season = req.nextUrl.searchParams.get("season") || "2026";

    if (id) {
      // 1. Search in 2026 mock
      let match = getMock2026Matches().find((f) => f.id === id);
      if (match) return NextResponse.json(match);

      // 2. Search in 2022 mock
      match = getMock2022Matches().find((f) => f.id === id);
      if (match) return NextResponse.json(match);

      // 3. Search in 1994 mock
      match = getMock1994Matches().find((f) => f.id === id);
      if (match) return NextResponse.json(match);

      // 4. Search in dynamic API matches
      const fixtures = await fetchFootballFixtures(season);
      match = fixtures.find((f) => f.id === id);
      if (match) return NextResponse.json(match);

      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const fixtures = await fetchFootballFixtures(season);
    return NextResponse.json(fixtures);
  } catch (error) {
    console.error("Error fetching fixtures in API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch fixtures" },
      { status: 500 }
    );
  }
}
