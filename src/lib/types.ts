// Core domain types for Capitol.
// These intentionally mirror the Supabase/Postgres schema in supabase/schema.sql
// so the seed-backed data layer can be swapped for real queries later.

export type OfficeType =
  | "senator"
  | "representative"
  | "governor"
  | "cabinet"
  | "president"
  | "candidate";

export type ChamberControl = "majority" | "minority" | "na";

export type ScoreCategory = "power" | "influence" | "truth" | "aura";

export type RosterSlot = "SEN" | "REP" | "EXEC" | "FLEX" | "BENCH";

export interface Party {
  id: string;
  name: string;
  abbr: string;
}

export interface Figure {
  id: string;
  fullName: string;
  slug: string;
  partyId: string;
  office: OfficeType;
  state: string; // 2-letter, or "US" for national offices
  chamberControl: ChamberControl;
  /** 0–100 prominence index (drives auction draft cost in V2). */
  prominence: number;
  photoUrl?: string;
  bioguideId?: string;
  wikidataId?: string;
  /** Wikipedia article title (defaults to fullName) used by the ingestion pipeline. */
  wikiTitle?: string;
}

/** An immutable, sourced event that produces points. The source of truth. */
export interface ScoredEvent {
  id: string;
  figureId: string;
  category: ScoreCategory;
  type: string;
  week: number;
  occurredAt: string; // ISO date
  basePoints: number;
  source: string;
  sourceUrl?: string;
  description: string;
}

export interface League {
  id: string;
  name: string;
  visibility: "private" | "public" | "global";
  ownerUserId: string;
  /** Weights per category, summing to 1. */
  scoringWeights: Record<ScoreCategory, number>;
  regularWeeks: number;
  playoffTeams: number;
  currentWeek: number;
}

export interface Team {
  id: string;
  leagueId: string;
  userId: string;
  name: string;
  ownerHandle: string;
  logoEmoji: string;
}

export interface RosterEntry {
  teamId: string;
  figureId: string;
  slot: RosterSlot;
}

export interface Matchup {
  id: string;
  leagueId: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
}

/** Derived: a figure's points in one category for one week. */
export interface FigureWeekScore {
  figureId: string;
  week: number;
  category: ScoreCategory;
  points: number;
}
