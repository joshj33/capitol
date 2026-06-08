import Link from "next/link";
import {
  getFiguresRanked,
  getLeague,
  getMatchups,
  getPartyAbbr,
  getStandings,
} from "@/lib/data";
import { FigureLink, Stat } from "@/components/ui";

export default function HomePage() {
  const league = getLeague();
  const standings = getStandings();
  const thisWeek = getMatchups(league.currentWeek);
  const trending = getFiguresRanked().slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="card bg-gradient-to-br from-gov-700 to-ink-soft">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Draft Congress. Score the news.
        </h1>
        <p className="mt-2 max-w-2xl text-gov-100">
          Capitol is fantasy sports for politics. Draft real public figures,
          then earn points from <strong>measurable, sourced events</strong> —
          bills passed, news coverage, fact-checks, viral moments. Politically
          neutral by design.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/league/${league.id}`} className="btn-primary">
            View my league →
          </Link>
          <Link href={`/league/${league.id}/draft`} className="btn-ghost">
            Enter draft room
          </Link>
          <Link href="/methodology" className="btn-ghost">
            How scoring works
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="League" value={league.name.replace("The ", "")} sub={`Week ${league.currentWeek} of ${league.regularWeeks}`} />
        <Stat label="Teams" value={standings.length} sub="private league" />
        <Stat label="Your record" value={`${standings.find((s) => s.team.id === "t-a")?.wins ?? 0}–${standings.find((s) => s.team.id === "t-a")?.losses ?? 0}`} sub="Capitol Hawks" />
        <Stat label="Scoring live" value="Power + Influence" sub="Truth & Aura in V2" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* This week's matchups */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-bold">Week {league.currentWeek} matchups</h2>
          {thisWeek.map((m) => (
            <Link
              key={m.id}
              href={`/league/${league.id}`}
              className="card flex items-center justify-between hover:border-gov-500"
            >
              <TeamSide emoji={m.home.team.logoEmoji} name={m.home.team.name} pts={m.home.points} />
              <span className="px-3 text-xs text-gov-400">LIVE</span>
              <TeamSide emoji={m.away.team.logoEmoji} name={m.away.team.name} pts={m.away.points} right />
            </Link>
          ))}

          {/* AI recap stub */}
          <div className="card border-dashed">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              ✨ AI Daily Recap
            </div>
            <p className="mt-1 text-sm text-gov-100">
              {trending[0]?.figure.fullName} led all rostered figures this week on
              the strength of legislative activity and heavy news coverage.
              Capitol Hawks hold a narrow lead in their matchup. (In V3 this
              recap is generated per-roster by Claude from the day&apos;s scored
              events.)
            </p>
          </div>
        </section>

        {/* Trending + standings */}
        <section className="space-y-6">
          <div>
            <h2 className="mb-2 text-lg font-bold">Trending figures</h2>
            <div className="card space-y-3">
              {trending.map(({ figure, total }) => (
                <div key={figure.id} className="flex items-center justify-between">
                  <FigureLink figure={figure} abbr={getPartyAbbr(figure.partyId)} />
                  <span className="tabular-nums font-semibold">{total}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-bold">Standings</h2>
            <div className="card space-y-2 text-sm">
              {standings.map((s, i) => (
                <div key={s.team.id} className="flex items-center justify-between">
                  <span>
                    <span className="mr-2 text-gov-400">{i + 1}</span>
                    {s.team.logoEmoji} {s.team.name}
                  </span>
                  <span className="tabular-nums text-gov-400">
                    {s.wins}–{s.losses}
                    {s.ties ? `–${s.ties}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamSide({
  emoji,
  name,
  pts,
  right,
}: {
  emoji: string;
  name: string;
  pts: number;
  right?: boolean;
}) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${right ? "justify-end text-right" : ""}`}>
      {!right && <span className="text-xl">{emoji}</span>}
      <div>
        <div className="font-semibold">{name}</div>
        <div className="text-lg font-bold tabular-nums text-gold">{pts}</div>
      </div>
      {right && <span className="text-xl">{emoji}</span>}
    </div>
  );
}
