import { Match } from "@/components/MatchCard";
import { getPoolStatusViaMcp } from "./injective";

const API_KEY = process.env.FOOTBALL_API_KEY;

function getDynamicVenue(
  homeTeam: string,
  awayTeam: string,
  stage: string,
  season: string,
  matchId: string
): string {
  const stadiums2026 = [
    "MetLife Stadium, New Jersey",
    "Estadio Azteca, Mexico City",
    "BC Place, Vancouver",
    "SoFi Stadium, Los Angeles",
    "AT&T Stadium, Dallas",
    "Mercedes-Benz Stadium, Atlanta",
    "Hard Rock Stadium, Miami",
    "Arrowhead Stadium, Kansas City",
    "Gillette Stadium, Boston",
    "NRG Stadium, Houston",
    "Lincoln Financial Field, Philadelphia",
    "Lumen Field, Seattle",
    "Levi's Stadium, San Francisco",
    "BMO Field, Toronto",
    "Estadio BBVA, Monterrey",
    "Estadio Akron, Guadalajara"
  ];

  const stadiums2022 = [
    "Lusail Iconic Stadium, Lusail",
    "Al Bayt Stadium, Al Khor",
    "Al Janoub Stadium, Al Wakrah",
    "Ahmad bin Ali Stadium, Al Rayyan",
    "Khalifa International Stadium, Al Rayyan",
    "Education City Stadium, Al Rayyan",
    "Stadium 974, Doha",
    "Al Thumama Stadium, Doha"
  ];

  const stadiums2018 = [
    "Luzhniki Stadium, Moscow",
    "Krestovsky Stadium, Saint Petersburg",
    "Fisht Olympic Stadium, Sochi",
    "Volgograd Arena, Volgograd",
    "Rostov Arena, Rostov-on-Don",
    "Nizhny Novgorod Stadium, Nizhny Novgorod",
    "Kazan Arena, Kazan",
    "Samara Arena, Samara",
    "Mordovia Arena, Saransk",
    "Kaliningrad Stadium, Kaliningrad",
    "Ekaterinburg Arena, Yekaterinburg",
    "Otkritie Arena, Moscow"
  ];

  const stadiums1994 = [
    "Rose Bowl, Pasadena",
    "Stanford Stadium, Stanford",
    "Pontiac Silverdome, Pontiac",
    "Giants Stadium, East Rutherford",
    "Soldier Field, Chicago",
    "Cotton Bowl, Dallas",
    "Foxboro Stadium, Foxborough",
    "Citrus Bowl, Orlando",
    "RFK Stadium, Washington, D.C."
  ];

  let stadiums = stadiums2026;
  if (season === "2022") stadiums = stadiums2022;
  else if (season === "2018") stadiums = stadiums2018;
  else if (season === "1994") stadiums = stadiums1994;

  const seed = (matchId || homeTeam || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % stadiums.length;

  const isFinal = stage && (
    stage.toLowerCase().includes("final") ||
    stage.toLowerCase().includes("third") ||
    stage.toLowerCase().includes("juara") ||
    stage.toLowerCase().includes("perebutan")
  );
  if (isFinal) {
    return stadiums[0];
  }

  return stadiums[index];
}

export async function fetchFootballFixtures(season = "2026"): Promise<Match[]> {
  // If the user selects 1994, return mock data directly (historic matches not in API-Data free tier)
  if (season === "1994") {
    return getMock1994Matches();
  }

  if (!API_KEY) {
    console.warn("FOOTBALL_API_KEY is not set. Using static fallback data.");
    return getFallbackMatchesForSeason(season);
  }

  try {
    // football-data.org uses ID 2000 or TLA 'WC' for FIFA World Cup
    const url = `https://api.football-data.org/v4/competitions/WC/matches?season=${season}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": API_KEY,
      },
      next: { revalidate: 300 }, // Next.js cache for 5 minutes (300 seconds)
    });

    if (!res.ok) {
      throw new Error(`football-data.org responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.errorCode || data.message) {
      throw new Error(`football-data.org error: ${data.message || data.errorCode}`);
    }

    const responseList = data.matches || [];
    if (responseList.length === 0) {
      console.warn(`football-data.org returned no matches for season ${season}. Using static fallback data.`);
      return getFallbackMatchesForSeason(season);
    }

    const STAGE_MAP: Record<string, string> = {
      "FINAL": "Final",
      "THIRD_PLACE": "Third Place Play-off",
      "SEMI_FINALS": "Semi-finals",
      "QUARTER_FINALS": "Quarter-finals",
      "LAST_16": "Round of 16",
      "GROUP_STAGE": "Group Stage",
    };

    const matches: Match[] = responseList.map((item: any) => {
      let status: "UPCOMING" | "LIVE" | "FINISHED" = "UPCOMING";

      if (["IN_PLAY", "PAUSED"].includes(item.status)) {
        status = "LIVE";
      } else if (["FINISHED", "AWARDED"].includes(item.status)) {
        status = "FINISHED";
      }

      const stage = STAGE_MAP[item.stage] || item.stage || "Match";

      return {
        id: String(item.id),
        stage: stage,
        kickoff: item.utcDate,
        home: item.homeTeam.name || "TBD",
        away: item.awayTeam.name || "TBD",
        homeFlag: item.homeTeam.crest || "⚽",
        awayFlag: item.awayTeam.crest || "⚽",
        venue: item.venue || getDynamicVenue(
          item.homeTeam.name || "",
          item.awayTeam.name || "",
          stage,
          season,
          String(item.id)
        ),
        status,
        score: item.score?.fullTime?.home !== null && item.score?.fullTime?.away !== null ? {
          home: item.score.fullTime.home,
          away: item.score.fullTime.away
        } : undefined,
      };
    });

    // Dynamically retrieve the pool split from Injective MCP Server for each match
    const matchesWithPools = await Promise.all(
      matches.map(async (match: Match) => {
        try {
          const pool = await getPoolStatusViaMcp(match.id);
          return {
            ...match,
            poolSplit: {
              home: pool.home,
              draw: pool.draw,
              away: pool.away
            }
          };
        } catch (e) {
          return {
            ...match,
            poolSplit: { home: 38, draw: 24, away: 38 }
          };
        }
      })
    );

    return matchesWithPools;
  } catch (error) {
    console.error(`Failed to fetch fixtures for season ${season} from football-data.org:`, error);
    return getFallbackMatchesForSeason(season);
  }
}

export function getMock2026Matches(): Match[] {
  return [
    {
      id: "m-usa-mex-01",
      stage: "Group A",
      kickoff: "2026-07-10T19:00:00Z",
      home: "USA",
      away: "Mexico",
      homeFlag: "🇺🇸",
      awayFlag: "🇲🇽",
      venue: "MetLife Stadium, New Jersey",
      status: "LIVE",
      score: { home: 1, away: 1 },
      poolSplit: { home: 38, draw: 24, away: 38 }
    },
    {
      id: "m-arg-fra-02",
      stage: "Quarter-finals",
      kickoff: "2026-07-11T22:00:00Z",
      home: "Argentina",
      away: "France",
      homeFlag: "🇦🇷",
      awayFlag: "🇫🇷",
      venue: "Estadio Azteca, Mexico City",
      status: "UPCOMING",
      poolSplit: { home: 45, draw: 20, away: 35 }
    },
    {
      id: "m-idn-jpn-03",
      stage: "Group D",
      kickoff: "2026-07-12T13:00:00Z",
      home: "Indonesia",
      away: "Japan",
      homeFlag: "🇮🇩",
      awayFlag: "🇯🇵",
      venue: "BC Place, Vancouver",
      status: "UPCOMING",
      poolSplit: { home: 22, draw: 26, away: 52 }
    }
  ];
}

export function getMock2022Matches(): Match[] {
  return [
    {
      id: "m-por-sui-22",
      stage: "Round of 16",
      kickoff: "2022-12-06T19:00:00Z",
      home: "Portugal",
      away: "Switzerland",
      homeFlag: "🇵🇹",
      awayFlag: "🇨🇭",
      venue: "Lusail Iconic Stadium, Lusail",
      status: "FINISHED",
      score: { home: 6, away: 1 },
      poolSplit: { home: 58, draw: 18, away: 24 }
    },
    {
      id: "m-arg-fra-22",
      stage: "Final",
      kickoff: "2022-12-18T15:00:00Z",
      home: "Argentina",
      away: "France",
      homeFlag: "🇦🇷",
      awayFlag: "🇫🇷",
      venue: "Lusail Iconic Stadium, Lusail",
      status: "FINISHED",
      score: { home: 3, away: 3 },
      poolSplit: { home: 48, draw: 22, away: 30 }
    },
    {
      id: "m-cro-bra-22",
      stage: "Perempat Final",
      kickoff: "2022-12-09T15:00:00Z",
      home: "Croatia",
      away: "Brazil",
      homeFlag: "🇭🇷",
      awayFlag: "🇧🇷",
      venue: "Education City Stadium, Ar-Rayyan",
      status: "FINISHED",
      score: { home: 1, away: 1 },
      poolSplit: { home: 20, draw: 30, away: 50 }
    }
  ];
}

export function getMock1994Matches(): Match[] {
  return [
    {
      id: "m-bra-ita-94",
      stage: "Final",
      kickoff: "1994-07-17T19:30:00Z",
      home: "Brazil",
      away: "Italy",
      homeFlag: "🇧🇷",
      awayFlag: "🇮🇹",
      venue: "Rose Bowl, Pasadena",
      status: "FINISHED",
      score: { home: 0, away: 0 },
      poolSplit: { home: 55, draw: 20, away: 25 }
    },
    {
      id: "m-swe-bul-94",
      stage: "Third Place",
      kickoff: "1994-07-16T16:30:00Z",
      home: "Sweden",
      away: "Bulgaria",
      homeFlag: "🇸🇪",
      awayFlag: "🇧🇬",
      venue: "Rose Bowl, Pasadena",
      status: "FINISHED",
      score: { home: 4, away: 0 },
      poolSplit: { home: 42, draw: 28, away: 30 }
    },
    {
      id: "m-rom-swe-94",
      stage: "Quarter-finals",
      kickoff: "1994-07-10T19:30:00Z",
      home: "Romania",
      away: "Sweden",
      homeFlag: "🇷🇴",
      awayFlag: "🇸🇪",
      venue: "Stanford Stadium, Stanford",
      status: "FINISHED",
      score: { home: 2, away: 2 },
      poolSplit: { home: 35, draw: 30, away: 35 }
    }
  ];
}

export function getFallbackMatchesForSeason(season: string): Match[] {
  if (season === "2026") {
    return getMock2026Matches();
  }
  if (season === "2022") {
    return getMock2022Matches();
  }
  if (season === "1994") {
    return getMock1994Matches();
  }
  return getMock2026Matches();
}
