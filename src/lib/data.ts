// Data-access entry point.
//
// Pages call `const q = await getQueries()` and then use the synchronous q.*
// helpers. The dataset is loaded from Supabase when configured (env vars
// present), otherwise from the in-memory seed — so the app runs locally with no
// setup, and "going live" is just adding credentials + running the seed upload.

import { cache } from "react";
import { getCurrentUser } from "./auth";
import { isSupabaseConfigured } from "./supabase";
import { seedDataset, type Dataset } from "./dataset";
import { createQueries, type Queries } from "./queries";

async function loadDataset(viewerUserId: string | null): Promise<Dataset> {
  if (isSupabaseConfigured()) {
    // Imported lazily so the Supabase client is never bundled/initialized when
    // running in seed mode.
    const { fetchDataset } = await import("./supabase-repo");
    return fetchDataset(viewerUserId);
  }
  return seedDataset();
}

/**
 * Load the dataset (scoped to the signed-in user) and return the bound query
 * API. Wrapped in React's `cache` so multiple components in one request/render
 * share a single load. `getCurrentUser` no-ops in seed mode, so this stays
 * statically renderable with zero config.
 */
export const getQueries = cache(async (): Promise<Queries> => {
  const user = await getCurrentUser();
  const viewerUserId = user?.id ?? null;
  const ds = await loadDataset(viewerUserId);
  return createQueries(ds, viewerUserId);
});

export type { Queries, MatchupView } from "./queries";
