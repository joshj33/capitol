import Link from "next/link";
import { getQueries } from "@/lib/data";
import { FigureLink } from "@/components/ui";

export default async function LeaguePage() {
  const q = await getQueries();
  const league = q.getLeague();
  const standings = q.getStandings();
  const teams = q.getTeams();
  const weeks = Array.from({ length: league.currentWeek }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-gov-400">
            Private league · Week {league.currentWeek} of {league.regularWeeks} ·
            Top {league.playoffTeams} make the playoffs
          </p>
        </div>
        <Link href={`/league/${league.id}/draft`} className="btn-primary">
          Draft room
        </Link>
      </header>

      {/* Standings table */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Standings</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gov-400">
              <tr className="border-b border-ink-line">
                <th className="p-3">#</th>
                <th className="p-3">Team</th>
                <th className="p-3">Manager</th>
                <th className="p-3 text-right">W</th>
                <th className="p-3 text-right">L</th>
                <th className="p-3 text-right">Pts For</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.team.id} className="border-b border-ink-line/50 last:border-0">
                  <td className="p-3 text-gov-400">{i + 1}</td>
                  <td className="p-3 font-medium">
                    {s.team.logoEmoji} {s.team.name}
                    {i < league.playoffTeams && (
                      <span className="ml-2 chip bg-good/15 text-good">playoff</span>
                    )}
                  </td>
                  <td className="p-3 text-gov-400">@{s.team.ownerHandle}</td>
                  <td className="p-3 text-right tabular-nums">{s.wins}</td>
                  <td className="p-3 text-right tabular-nums">{s.losses}</td>
                  <td className="p-3 text-right tabular-nums font-semibold">{s.pointsFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matchups by week */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Matchups</h2>
        <div className="space-y-4">
          {weeks
            .slice()
            .reverse()
            .map((week) => (
              <div key={week}>
                <div className="mb-1 text-xs uppercase tracking-wide text-gov-400">
                  Week {week}
                  {week === league.currentWeek && (
                    <span className="ml-2 text-gold">· live</span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {q.getMatchups(week).map((m) => {
                    const homeWin = m.home.points > m.away.points;
                    const awayWin = m.away.points > m.home.points;
                    return (
                      <div key={m.id} className="card flex items-center justify-between">
                        <div className={homeWin ? "font-semibold" : "text-gov-100"}>
                          {m.home.team.logoEmoji} {m.home.team.name}
                          <div className="text-lg font-bold tabular-nums text-gold">
                            {m.home.points}
                          </div>
                        </div>
                        <span className="text-xs text-gov-400">vs</span>
                        <div className={`text-right ${awayWin ? "font-semibold" : "text-gov-100"}`}>
                          {m.away.team.name} {m.away.team.logoEmoji}
                          <div className="text-lg font-bold tabular-nums text-gold">
                            {m.away.points}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Rosters with legality meter */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Rosters</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {teams.map((team) => {
            const roster = q.getRosterFigures(team.id);
            const { rules, legal } = q.getRosterLegality(team.id);
            return (
              <div key={team.id} className="card">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">
                    {team.logoEmoji} {team.name}
                  </h3>
                  <span
                    className={`chip ${legal ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}
                  >
                    {legal ? "✓ legal roster" : "✗ illegal"}
                  </span>
                </div>

                <div className="space-y-2">
                  {roster.map(({ figure, slot }) => (
                    <div key={figure.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-xs font-semibold text-gov-400">
                          {slot}
                        </span>
                        <FigureLink figure={figure} abbr={q.getPartyAbbr(figure.partyId)} />
                      </div>
                      <span className="tabular-nums text-sm font-semibold">
                        {q.getFigureSeasonTotal(figure.id)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* legality meter */}
                <div className="mt-3 space-y-1 border-t border-ink-line pt-3 text-xs">
                  {rules.map((r) => (
                    <div key={r.key} className="flex items-center justify-between">
                      <span className={r.ok ? "text-good" : "text-bad"}>
                        {r.ok ? "✓" : "✗"} {r.label}
                      </span>
                      <span className="text-gov-400">{r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
