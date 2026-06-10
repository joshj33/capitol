import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The app reads public data with the anon key. Writes (the ETL pipeline and the
// seed-upload script) use the service-role key and live in scripts/, never in
// the client bundle.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are present; otherwise the app uses the seed. */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

let client: SupabaseClient | null = null;

/** Anon Supabase client (read-only by RLS). Cached across calls. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_* env vars).");
  }
  if (!client) {
    client = createClient(URL!, ANON!, { auth: { persistSession: false } });
  }
  return client;
}
