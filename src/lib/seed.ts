import type {
  Figure,
  League,
  Matchup,
  OfficeType,
  Party,
  RosterEntry,
  ScoredEvent,
  Team,
} from "./types";
import rawFigures from "./figures.json";
import pageviewsData from "./pageviews.json";
import powerData from "./power.json";

// ---------------------------------------------------------------------------
// Parties (neutral metadata only — name + abbreviation)
// ---------------------------------------------------------------------------
export const parties: Party[] = [
  { id: "p-dem", name: "Democratic", abbr: "D" },
  { id: "p-rep", name: "Republican", abbr: "R" },
  { id: "p-ind", name: "Independent", abbr: "I" },
];

const PARTY_ID: Record<string, string> = { D: "p-dem", R: "p-rep", I: "p-ind" };

// ---------------------------------------------------------------------------
// Figure pool — built from the single source of truth in figures.json (also
// read by scripts/ingest-influence.mjs). chamberControl reflects current
// chamber control per official record (here: Republicans = majority) and is
// used only for the roster "governing + opposition" rule — not an editorial
// judgment.
// ---------------------------------------------------------------------------
interface RawFigure {
  id: string;
  name: string;
  party: "D" | "R" | "I";
  office: OfficeType;
  state: string;
  prominence: number;
  wikiTitle?: string;
  bioguideId?: string;
}

function maj(party: "D" | "R" | "I"): Figure["chamberControl"] {
  return party === "R" ? "majority" : "minority";
}

export const figures: Figure[] = (rawFigures as RawFigure[]).map((rf) => ({
  id: rf.id,
  fullName: rf.name,
  slug: rf.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, ""),
  partyId: PARTY_ID[rf.party],
  office: rf.office,
  state: rf.state,
  chamberControl:
    rf.office === "senator" || rf.office === "representative" ? maj(rf.party) : "na",
  prominence: rf.prominence,
  wikiTitle: rf.wikiTitle,
  bioguideId: rf.bioguideId,
}));

export function figureById(id: string): Figure | undefined {
  return figures.find((f) => f.id === id);
}
export function figureBySlug(slug: string): Figure | undefined {
  return figures.find((f) => f.slug === slug);
}
export function partyById(id: string): Party {
  return parties.find((p) => p.id === id)!;
}
export function wikiTitleFor(f: Figure): string {
  return f.wikiTitle ?? f.fullName;
}

// ---------------------------------------------------------------------------
// Demo league + teams + rosters (each roster: 2 SEN, 2 REP, 1 EXEC, 1 FLEX).
// Rosters are pre-built to satisfy the balance rules.
// ---------------------------------------------------------------------------
export const demoLeague: League = {
  id: "lg-beltway",
  name: "The Beltway League",
  visibility: "private",
  ownerUserId: "u-maya",
  // V1 launches with Power + Influence only; Truth + Aura arrive in V2.
  scoringWeights: { power: 0.6, influence: 0.4, truth: 0, aura: 0 },
  regularWeeks: 10,
  playoffTeams: 4,
  currentWeek: 4,
};

export const teams: Team[] = [
  { id: "t-a", leagueId: demoLeague.id, userId: "u-maya", name: "Capitol Hawks", ownerHandle: "maya", logoEmoji: "🦅" },
  { id: "t-b", leagueId: demoLeague.id, userId: "u-dev", name: "Beltway Bandits", ownerHandle: "dev", logoEmoji: "🎩" },
  { id: "t-c", leagueId: demoLeague.id, userId: "u-sam", name: "The Filibusters", ownerHandle: "sam", logoEmoji: "🗣️" },
  { id: "t-d", leagueId: demoLeague.id, userId: "u-nora", name: "Quorum Crew", ownerHandle: "nora", logoEmoji: "⚖️" },
];

const slot = (teamId: string, figureId: string, s: RosterEntry["slot"]): RosterEntry => ({
  teamId,
  figureId,
  slot: s,
});

export const rosters: RosterEntry[] = [
  // Team A
  slot("t-a", "s01", "SEN"), slot("t-a", "s02", "SEN"),
  slot("t-a", "r01", "REP"), slot("t-a", "r04", "REP"),
  slot("t-a", "e01", "EXEC"), slot("t-a", "s09", "FLEX"),
  // Team B
  slot("t-b", "s03", "SEN"), slot("t-b", "s04", "SEN"),
  slot("t-b", "r03", "REP"), slot("t-b", "r02", "REP"),
  slot("t-b", "e02", "EXEC"), slot("t-b", "r09", "FLEX"),
  // Team C
  slot("t-c", "s05", "SEN"), slot("t-c", "s06", "SEN"),
  slot("t-c", "r05", "REP"), slot("t-c", "r06", "REP"),
  slot("t-c", "e03", "EXEC"), slot("t-c", "s10", "FLEX"),
  // Team D
  slot("t-d", "s07", "SEN"), slot("t-d", "s08", "SEN"),
  slot("t-d", "r08", "REP"), slot("t-d", "r07", "REP"),
  slot("t-d", "e04", "EXEC"), slot("t-d", "r10", "FLEX"),
];

/** Figures not on any roster — available as free agents in the draft/waiver browser. */
export function freeAgentFigures(): Figure[] {
  const owned = new Set(rosters.map((r) => r.figureId));
  return figures.filter((f) => !owned.has(f.id));
}

export const matchups: Matchup[] = [
  { id: "m-1-1", leagueId: demoLeague.id, week: 1, homeTeamId: "t-a", awayTeamId: "t-b" },
  { id: "m-1-2", leagueId: demoLeague.id, week: 1, homeTeamId: "t-c", awayTeamId: "t-d" },
  { id: "m-2-1", leagueId: demoLeague.id, week: 2, homeTeamId: "t-a", awayTeamId: "t-c" },
  { id: "m-2-2", leagueId: demoLeague.id, week: 2, homeTeamId: "t-b", awayTeamId: "t-d" },
  { id: "m-3-1", leagueId: demoLeague.id, week: 3, homeTeamId: "t-a", awayTeamId: "t-d" },
  { id: "m-3-2", leagueId: demoLeague.id, week: 3, homeTeamId: "t-b", awayTeamId: "t-c" },
  { id: "m-4-1", leagueId: demoLeague.id, week: 4, homeTeamId: "t-a", awayTeamId: "t-b" },
  { id: "m-4-2", leagueId: demoLeague.id, week: 4, homeTeamId: "t-c", awayTeamId: "t-d" },
];

// ---------------------------------------------------------------------------
// Real Influence data from the ingestion pipeline (Wikipedia Pageviews API).
// scripts/ingest-influence.mjs writes pageviews.json; when a figure/week is
// present we use the real, sourced value, otherwise we fall back to a seeded
// synthetic value so the app always has a full board.
// ---------------------------------------------------------------------------
interface PageviewCell {
  views: number;
  points: number;
}
const pageviews = pageviewsData as {
  generatedAt: string | null;
  source: string;
  weeks: number;
  data: Record<string, Record<string, PageviewCell>>;
};

export const usingRealInfluence = pageviews.generatedAt !== null;

interface PowerEvent {
  type: string;
  basePoints: number;
  description: string;
  url: string;
}
const power = powerData as {
  generatedAt: string | null;
  source: string;
  figuresIngested: string[];
  data: Record<string, Record<string, { points: number; events: PowerEvent[] }>>;
};
const powerIngested = new Set(power.figuresIngested);
export const usingRealPower = power.generatedAt !== null;

// ---------------------------------------------------------------------------
// Deterministic event generator. Power/Aura/Truth are seeded; Influence prefers
// real pageview data when available. In production all of these come from the
// ETL pipeline (Congress.gov, GDELT, Wikipedia, fact-check APIs).
// ---------------------------------------------------------------------------
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ISO = (week: number, dayOffset = 0) => {
  const base = new Date("2026-03-02T12:00:00Z");
  base.setUTCDate(base.getUTCDate() + (week - 1) * 7 + dayOffset);
  return base.toISOString();
};

function buildEvents(): ScoredEvent[] {
  const out: ScoredEvent[] = [];
  let n = 0;
  const add = (e: Omit<ScoredEvent, "id">) =>
    out.push({ id: `ev-${(++n).toString().padStart(4, "0")}`, ...e });

  for (const f of figures) {
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      wikiTitleFor(f).replace(/ /g, "_"),
    )}`;
    for (let week = 1; week <= demoLeague.currentWeek; week++) {
      const rnd = mulberry32(hashSeed(`${f.id}:${week}`));
      const prom = f.prominence / 100;

      // --- POWER: real Congress.gov legislation when ingested, else synthetic ---
      if (powerIngested.has(f.id)) {
        const wk = power.data[f.id]?.[String(week)];
        for (const pe of wk?.events ?? []) {
          add({
            figureId: f.id, category: "power", type: pe.type, week,
            occurredAt: ISO(week, 2), basePoints: pe.basePoints,
            source: "Congress.gov API", sourceUrl: pe.url,
            description: pe.description,
          });
        }
        // A week with no legislative activity legitimately scores 0 Power.
      } else {
        // Separate PRNG so the Power branch never shifts Aura/Truth randomness.
        const rp = mulberry32(hashSeed(`${f.id}:${week}:power`));
        const votes = 4 + Math.floor(rp() * 9);
        add({
          figureId: f.id, category: "power", type: "votes_cast", week,
          occurredAt: ISO(week, 1), basePoints: votes * 0.5,
          source: "Congress.gov / OpenStates (synthetic)", sourceUrl: "https://www.congress.gov",
          description: `${votes} roll-call votes cast`,
        });
        if (rp() < 0.5) {
          const cos = 1 + Math.floor(rp() * 3);
          add({
            figureId: f.id, category: "power", type: "cosponsor", week,
            occurredAt: ISO(week, 2), basePoints: cos,
            source: "Congress.gov (synthetic)", sourceUrl: "https://www.congress.gov",
            description: `Co-sponsored ${cos} bill(s)`,
          });
        }
        if (rp() < 0.35) {
          add({
            figureId: f.id, category: "power", type: "sponsor", week,
            occurredAt: ISO(week, 2), basePoints: 3,
            source: "Congress.gov (synthetic)", sourceUrl: "https://www.congress.gov",
            description: "Sponsored a bill",
          });
        }
        if (rp() < 0.12 * (0.5 + prom)) {
          add({
            figureId: f.id, category: "power", type: "bill_passed_chamber", week,
            occurredAt: ISO(week, 3), basePoints: 8,
            source: "Congress.gov (synthetic)", sourceUrl: "https://www.congress.gov",
            description: "Sponsored bill passed its chamber",
          });
        }
        if (f.chamberControl !== "na" && rp() < 0.25) {
          add({
            figureId: f.id, category: "power", type: "committee", week,
            occurredAt: ISO(week, 0), basePoints: 2,
            source: "Official record (synthetic)",
            description: "Committee / leadership role",
          });
        }
      }

      // --- INFLUENCE: real Wikipedia pageviews when available, else synthetic ---
      const real = pageviews.data[f.id]?.[String(week)];
      if (real) {
        add({
          figureId: f.id, category: "influence", type: "pageviews", week,
          occurredAt: ISO(week, 4), basePoints: real.points,
          source: "Wikipedia Pageviews API", sourceUrl: wikiUrl,
          description: `${real.views.toLocaleString()} Wikipedia pageviews this week`,
        });
      } else {
        const influence = Math.round((6 + prom * 22 + rnd() * 10) * 10) / 10;
        add({
          figureId: f.id, category: "influence", type: "attention_index", week,
          occurredAt: ISO(week, 4), basePoints: influence,
          source: "GDELT + Wikipedia Pageviews + Google Trends (synthetic)",
          sourceUrl: "https://en.wikipedia.org/w/api.php",
          description: "Weekly attention index (estimated)",
        });
      }

      // --- AURA (V2): momentum spikes ---
      if (rnd() < 0.18 * (0.4 + prom)) {
        const sigma = rnd() < 0.4 ? 3 : 2;
        add({
          figureId: f.id, category: "aura", type: "viral_spike", week,
          occurredAt: ISO(week, 5), basePoints: sigma === 3 ? 20 : 10,
          source: "Wikipedia Pageviews (>2σ baseline spike)",
          description: `Attention spike (>${sigma}σ above 30-day baseline)`,
        });
      }

      // --- TRUTH (V2): third-party fact-checks ---
      if (rnd() < 0.15) {
        const ratings: [string, number][] = [
          ["True", 5], ["Mostly True", 3], ["Half True", 1],
          ["Mostly False", -2], ["False", -4],
        ];
        const [label, pts] = ratings[Math.floor(rnd() * ratings.length)];
        add({
          figureId: f.id, category: "truth", type: "fact_check", week,
          occurredAt: ISO(week, 3), basePoints: pts,
          source: "Google Fact Check Tools API (ClaimReview)",
          sourceUrl: "https://toolbox.google.com/factcheck/explorer",
          description: `Fact-check rating: ${label}`,
        });
      }
    }
  }
  return out;
}

export const events: ScoredEvent[] = buildEvents();
