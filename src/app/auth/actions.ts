"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
