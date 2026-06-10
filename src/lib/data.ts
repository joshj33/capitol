// Data-access entry point.
//
// Pages call `const q = await getQueries()` and then use the synchronous q.*
// helpers. The dataset is loaded from Supabase when configured (env vars
// present), otherwise from the in-memory seed — so the app runs locally with no
// setup, and "going live" is just adding credentials + running the seed upload.

import { cache } from "react";
import { isSupabaseConfigured } from "./supabase";
import { seedDataset, type Dataset } from "./dataset";
import { createQueries, type Queries } from "./queries";

async function loadDataset(): Promise<Dataset> {
  if (isSupabaseConfigured()) {
    // Imported lazily so the Supabase client is never bundled/initialized when
    // running in seed mode.
    const { fetchDataset } = await import("./supabase-repo");
    return fetchDataset();
  }
  return seedDataset();
}

/**
 * Load the dataset and return the bound query API. Wrapped in React's `cache`
 * so multiple components in one request/render share a single load.
 */
export const getQueries = cache(async (): Promise<Queries> => {
  const ds = await loadDataset();
  return createQueries(ds);
});

export type { Queries, MatchupView } from "./queries";
