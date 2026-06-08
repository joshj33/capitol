import { CATEGORY_META } from "@/lib/scoring";

const POWER_RULES = [
  ["Bill sponsored", "+3"],
  ["Bill co-sponsored", "+1"],
  ["Bill passes sponsor's chamber", "+8"],
  ["Bill enacted into law", "+20"],
  ["Amendment adopted", "+4"],
  ["Roll-call vote cast", "+0.5"],
  ["Committee / leadership role (weekly)", "+2"],
  ["Election won", "+50"],
  ["Confirmed to office", "+25"],
];

const TRUTH_RULES = [
  ["True", "+5"],
  ["Mostly True", "+3"],
  ["Half True / Mixed", "+1"],
  ["Mostly False", "−2"],
  ["False", "−4"],
  ["Pants-on-Fire / Fabricated", "−6"],
];

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Scoring Methodology</h1>
        <p className="mt-2 max-w-3xl text-gov-100">
          Capitol is <strong>politically neutral by design</strong>. Every point
          comes from a measurable, third-party-sourced event, computed by a
          published formula, and applied <strong>identically</strong> to every
          figure regardless of party. No category ever rewards or punishes an
          ideological position. This page is the full, public rulebook.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["power", "influence", "truth", "aura"] as const).map((c) => (
          <div key={c} className="card">
            <div className="flex items-center gap-2">
              <span
                className="chip"
                style={{ background: `${CATEGORY_META[c].color}22`, color: CATEGORY_META[c].color }}
              >
                {CATEGORY_META[c].label}
              </span>
              {(c === "truth" || c === "aura") && (
                <span className="chip bg-ink-line text-gov-400">V2</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gov-100">{CATEGORY_META[c].blurb}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: CATEGORY_META.power.color }}>
          Power Score
        </h2>
        <p className="text-sm text-gov-100">
          Pure official-record events — the most objective category and the
          anchor of V1. Sourced from Congress.gov, GovTrack, OpenStates, and the
          FEC.
        </p>
        <div className="card grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {POWER_RULES.map(([label, pts]) => (
            <div key={label} className="flex justify-between border-b border-ink-line/40 py-1">
              <span>{label}</span>
              <span className="font-semibold tabular-nums">{pts}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: CATEGORY_META.influence.color }}>
          Influence Score
        </h2>
        <p className="text-sm text-gov-100">
          A composite <strong>z-score of normalized attention metrics</strong>{" "}
          over the scoring week, so it&apos;s fair across figures of different
          sizes. Inputs: news-coverage volume (GDELT), Wikipedia pageviews,
          search interest (Google Trends), and public-appearance counts. Each
          metric is converted to a z-score against the figure pool, then averaged
          and scaled to a points band.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: CATEGORY_META.truth.color }}>
          Truth Score <span className="text-sm font-normal text-gov-400">(V2)</span>
        </h2>
        <p className="text-sm text-gov-100">
          Driven entirely by <strong>third-party fact-checks</strong> (Google
          Fact Check Tools API / ClaimReview), never our own judgment. Each rating
          is shown with a link to its source. Capped at the 5 most recent checks
          per week so volume doesn&apos;t dominate.
        </p>
        <div className="card grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {TRUTH_RULES.map(([label, pts]) => (
            <div key={label} className="flex justify-between border-b border-ink-line/40 py-1">
              <span>{label}</span>
              <span className="font-semibold tabular-nums">{pts}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold" style={{ color: CATEGORY_META.aura.color }}>
          Aura Score <span className="text-sm font-normal text-gov-400">(V2)</span>
        </h2>
        <p className="text-sm text-gov-100">
          The fun category, kept objective by measuring{" "}
          <strong>attention momentum</strong> rather than judging good vs. bad. A
          &ldquo;viral moment&rdquo; is defined statistically: any day with
          attention <strong>&gt;2 standard deviations</strong> above the
          figure&apos;s trailing 30-day baseline scores <strong>+10</strong>;{" "}
          <strong>&gt;3σ</strong> scores <strong>+20</strong>. Because it rewards
          change in either direction, Aura stays neutral and gives underdogs
          breakout weeks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Roster balance rules</h2>
        <p className="text-sm text-gov-100">
          To prevent loading up on one side, every roster must satisfy four
          ideological-diversity rules, enforced at draft time:
        </p>
        <ul className="card list-inside list-disc space-y-1 text-sm text-gov-100">
          <li>No more than 50% of starters from any single party</li>
          <li>At least two parties represented</li>
          <li>
            At least 3 governing-party and 3 opposition figures (scaled down for
            smaller rosters)
          </li>
          <li>Figures from at least 4 different states</li>
        </ul>
      </section>

      <p className="text-xs text-gov-400">
        Chamber-control labels (majority/minority) come from the official record
        and describe the current composition of Congress — they are not an
        editorial judgment. Tragedies, violence, and similar events are excluded
        from scoring.
      </p>
    </div>
  );
}
