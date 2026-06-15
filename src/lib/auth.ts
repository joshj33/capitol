import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * The authenticated user for the current request, or null when signed out or
 * when Supabase isn't configured. The early return means cookies() is never
 * touched in seed mode, so pages can still render statically there.
 * Wrapped in cache() so multiple components share one lookup per request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
