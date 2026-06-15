import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client (Server Components, Route Handlers, Server
// Actions). Cookie-backed so the session is available to RLS via auth.uid().
// Only call this inside a request scope (never at build / module top-level).
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Throws in a Server Component (read-only cookies); fine — the
        // middleware refreshes the session cookie on every request.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* called from a Server Component — ignore */
        }
      },
    },
  });
}
