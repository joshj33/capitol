import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/league/lg-beltway", label: "League" },
  { href: "/league/lg-beltway/draft", label: "Draft" },
  { href: "/players", label: "Players" },
  { href: "/methodology", label: "Methodology" },
];

export async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-ink-line bg-ink-soft/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-lg">🏛️</span>
          <span>Capitol</span>
          <span className="hidden text-xs font-normal text-gov-400 sm:inline">
            · fantasy politics
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-gov-100 hover:bg-ink-line/60"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden max-w-[14rem] truncate text-gov-400 sm:inline">
                {user.email}
              </span>
              <form action={signOut}>
                <button type="submit" className="btn-ghost">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
