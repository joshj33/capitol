import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client for client components (login form, etc.).
// Reads the public env vars, which Next inlines at build time.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfiguredInBrowser(): boolean {
  return Boolean(URL && ANON);
}

export function createSupabaseBrowserClient() {
  if (!URL || !ANON) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_* env vars).");
  }
  return createBrowserClient(URL, ANON);
}
