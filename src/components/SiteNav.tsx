import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/league/lg-beltway", label: "League" },
  { href: "/league/lg-beltway/draft", label: "Draft" },
  { href: "/players", label: "Players" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteNav() {
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
      </div>
    </header>
  );
}
