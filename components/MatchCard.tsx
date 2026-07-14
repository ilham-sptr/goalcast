export type Match = {
  id: string;
  stage: string;
  kickoff: string; // ISO string
  home: string;
  away: string;
  homeFlag: string; // emoji flag, swap for real crest assets later
  awayFlag: string;
  venue: string;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  score?: { home: number; away: number };
  poolSplit?: { home: number; draw: number; away: number };
};

function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "LIVE";

  return (
    <article className="group relative overflow-hidden rounded-xl border border-pitchLine bg-[#0E241A] p-6 transition-colors hover:border-signal/60">
      <div className="mono-tag mb-4 flex items-center justify-between text-xs text-chalk/50">
        <span>{match.stage}</span>
        <span className="flex items-center gap-1.5">
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />}
          {isLive ? "LIVE" : formatKickoff(match.kickoff)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_60px_1fr] items-center gap-2">
        {/* Home Team */}
        <div className="flex items-center gap-2 min-w-0">
          {match.homeFlag.startsWith("http") ? (
            <img src={match.homeFlag} alt={match.home} className="h-6 w-6 flex-shrink-0 object-contain rounded-sm" />
          ) : (
            <span className="text-xl flex-shrink-0 leading-none">{match.homeFlag}</span>
          )}
          <span className="font-display text-[15px] font-semibold truncate" title={match.home}>{match.home}</span>
        </div>

        {/* Score */}
        <div className="font-display text-lg font-bold text-flare text-center whitespace-nowrap px-1">
          {match.score ? `${match.score.home} – ${match.score.away}` : "vs"}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-2 min-w-0 text-right">
          <span className="font-display text-[15px] font-semibold truncate" title={match.away}>{match.away}</span>
          {match.awayFlag.startsWith("http") ? (
            <img src={match.awayFlag} alt={match.away} className="h-6 w-6 flex-shrink-0 object-contain rounded-sm" />
          ) : (
            <span className="text-xl flex-shrink-0 leading-none">{match.awayFlag}</span>
          )}
        </div>
      </div>

      <p className="mono-tag mt-4 text-[11px] text-chalk/40 truncate" title={match.venue}>{match.venue}</p>

      {match.poolSplit && (
        <div className="mt-4">
          <div className="mono-tag mb-1.5 flex justify-between text-[10px] text-chalk/50">
            <span>{match.poolSplit.home}% Home</span>
            <span>{match.poolSplit.draw}% Draw</span>
            <span>{match.poolSplit.away}% Away</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-pitchLine">
            <div className="bg-signal" style={{ width: `${match.poolSplit.home}%` }} />
            <div className="bg-flare" style={{ width: `${match.poolSplit.draw}%` }} />
            <div className="bg-clay" style={{ width: `${match.poolSplit.away}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <a
          href={`/chat?match=${match.id}`}
          className="flex-1 rounded-lg bg-signal/10 px-3 py-2 text-center text-sm font-medium text-signal transition-colors hover:bg-signal/20"
        >
          AI Analysis
        </a>
        <a
          href={`/chat?match=${match.id}&predict=1`}
          className="flex-1 rounded-lg border border-flare/40 px-3 py-2 text-center text-sm font-medium text-flare transition-colors hover:bg-flare/10"
        >
          On-chain Prediction
        </a>
      </div>
    </article>
  );
}
