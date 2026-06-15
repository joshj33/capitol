"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createSupabaseBrowserClient,
  supabaseConfiguredInBrowser,
} from "@/lib/supabase/client";

// useSearchParams() forces client rendering, so the page that uses it must sit
// under a Suspense boundary (Next bails out of static prerender otherwise).
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const configured = supabaseConfiguredInBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to land after auth — set by gated links (e.g. the draft room).
  // Only allow same-app paths so the param can't be used as an open redirect.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  if (!configured) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <div className="card mt-4 border-dashed">
          <p className="text-sm text-gov-100">
            Authentication needs Supabase. Add{" "}
            <code className="text-gold">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code> (see <code>.env.local.example</code>) and restart the
            dev server. Until then the app runs as a public demo on seed data.
          </p>
          <Link href="/" className="btn-ghost mt-4">
            ← Back to demo
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setMsg({ kind: "ok", text: "Check your email to confirm your account, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!email) {
      setMsg({ kind: "error", text: "Enter your email first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    setMsg(
      error
        ? { kind: "error", text: error.message }
        : { kind: "ok", text: "Magic link sent — check your email." },
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-sm text-gov-400">
        {mode === "signin" ? "Welcome back to Capitol." : "Join Capitol and draft your roster."}
      </p>

      <form onSubmit={submit} className="card mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-gov-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 outline-none focus:border-gov-500"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gov-400">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 outline-none focus:border-gov-500"
            placeholder="••••••••"
          />
        </label>

        {msg && (
          <p className={`text-sm ${msg.kind === "error" ? "text-bad" : "text-good"}`}>
            {msg.text}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={magicLink}
          disabled={busy}
          className="btn-ghost w-full"
        >
          Email me a magic link
        </button>
      </form>

      <p className="mt-3 text-center text-sm text-gov-400">
        {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
        <button
          className="font-semibold text-gov-100 underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
