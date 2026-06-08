import { notFound } from "next/navigation";
import {
  getAllFigures,
  getFigureBySlug,
  getFigureEvents,
  getFigureSeasonByCategory,
  getFigureSeasonTotal,
  getFigureWeeklySeries,
  getPartyAbbr,
  getPartyName,
  teamOf,
} from "@/lib/data";
import { CATEGORY_META } from "@/lib/scoring";
import type { ScoreCategory } from "@/lib/types";
import {
  Avatar,
  CategoryBars,
  PartyChip,
  Sparkline,
  Stat,
  officeLabel,
} from "@/components/ui";

export function generateStaticParams() {
  return getAllFigures().map((f) => ({ slug: f.slug }));
}

export default function FigureProfile({ params }: { params: { slug: string } }) {
  const figure = getFigureBySlug(params.slug);
  if (!figure) notFound();

  const byCat = getFigureSeasonByCategory(figure.id);
  const series = getFigureWeeklySeries(figure.id);
  const events = getFigureEvents(figure.id);
  const total = getFigureSeasonTotal(figure.id);
  const owner = teamOf(figure.id);

  const bars = (["power", "influence", "truth", "aura"] as ScoreCategory[]).map((c) => ({
    label: CATEGORY_META[c].label,
    value: byCat[c],
    color: CATEGORY_META[c].color,
  }));

  return (
    <div className="space-y-6">
      <header className="card flex flex-wrap items-center gap-4">
        <Avatar name={figure.fullName} size={64} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {figure.fullName} <PartyChip abbr={getPartyAbbr(figure.partyId)} />
          </h1>
          <p className="text-sm text-gov-400">
            {officeLabel(figure.office)} · {figure.state} ·{" "}
            {getPartyName(figure.partyId)} ·{" "}
            {figure.chamberControl !== "na"
              ? `${figure.chamberControl} caucus`
              : "executive"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gov-400">Season pts</div>
          <div className="text-3xl font-extrabold text-gold">{total}</div>
          <div className="text-xs text-gov-400">
            {owner ? `Owned by ${owner.name}` : "Free agent"}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Power" value={byCat.power} />
        <Stat label="Influence" value={byCat.influence} />
        <Stat label="Truth (V2)" value={byCat.truth} />
        <Stat label="Aura (V2)" value={byCat.aura} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold">Season points by category</h2>
          <CategoryBars data={bars} />
        </section>

        <section className="card">
          <h2 className="mb-1 font-bold">Weekly trend</h2>
          <p className="mb-3 text-xs text-gov-400">
            Weighted fantasy points per week (Power 60% · Influence 40% in V1).
          </p>
          <Sparkline points={series} />
          <div className="mt-2 flex justify-between text-xs text-gov-400">
            {series.map((s) => (
              <span key={s.week}>W{s.week}</span>
            ))}
          </div>
        </section>
      </div>

      {/* Scored events with sources */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Recent scored events</h2>
        <div className="card p-0">
          {events.slice(0, 25).map((e) => {
            const meta = CATEGORY_META[e.category];
            return (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 border-b border-ink-line/50 p-3 last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="chip"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-sm">{e.description}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gov-400">
                    Week {e.week} ·{" "}
                    {e.sourceUrl ? (
                      <a
                        href={e.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-gov-100"
                      >
                        {e.source}
                      </a>
                    ) : (
                      e.source
                    )}
                  </div>
                </div>
                <span
                  className={`tabular-nums font-semibold ${
                    e.basePoints >= 0 ? "text-good" : "text-bad"
                  }`}
                >
                  {e.basePoints >= 0 ? "+" : ""}
                  {Math.round(e.basePoints * 10) / 10}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gov-400">
          Every point is traceable to a sourced event. Truth and Aura events are
          shown here but weighted at 0 in V1 leagues.
        </p>
      </section>
    </div>
  );
}
