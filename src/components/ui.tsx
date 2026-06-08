import Link from "next/link";
import type { Figure } from "@/lib/types";

const PARTY_STYLES: Record<string, string> = {
  D: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  R: "bg-red-500/15 text-red-300 border border-red-500/30",
  I: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
};

export function PartyChip({ abbr }: { abbr: string }) {
  return (
    <span className={`chip ${PARTY_STYLES[abbr] ?? "bg-ink-line text-gov-100"}`}>
      {abbr}
    </span>
  );
}

const OFFICE_LABEL: Record<Figure["office"], string> = {
  senator: "Senator",
  representative: "Representative",
  governor: "Governor",
  cabinet: "Cabinet",
  president: "President",
  candidate: "Candidate",
};

export function officeLabel(office: Figure["office"]): string {
  return OFFICE_LABEL[office];
}

/** Initials avatar — avoids depending on remote photo URLs that may break. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-gov-700 font-semibold text-gov-100"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-gov-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gov-400">{sub}</div>}
    </div>
  );
}

export function FigureLink({
  figure,
  abbr,
  className = "",
}: {
  figure: Figure;
  abbr: string;
  className?: string;
}) {
  return (
    <Link
      href={`/players/${figure.slug}`}
      className={`group flex items-center gap-3 ${className}`}
    >
      <Avatar name={figure.fullName} size={36} />
      <span>
        <span className="font-medium group-hover:underline">{figure.fullName}</span>
        <span className="ml-2 align-middle">
          <PartyChip abbr={abbr} />
        </span>
        <span className="block text-xs text-gov-400">
          {officeLabel(figure.office)} · {figure.state}
        </span>
      </span>
    </Link>
  );
}

/** Tiny inline bar-graph for category breakdowns (no chart library needed). */
export function CategoryBars({
  data,
  colors,
}: {
  data: { label: string; value: number; color: string }[];
  colors?: never;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-sm">
          <span className="w-20 shrink-0 text-gov-400">{d.label}</span>
          <span className="relative h-3 flex-1 overflow-hidden rounded bg-ink-line">
            <span
              className="absolute inset-y-0 left-0 rounded"
              style={{
                width: `${(Math.abs(d.value) / max) * 100}%`,
                background: d.color,
              }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Weekly trend sparkline rendered as inline SVG. */
export function Sparkline({ points }: { points: { week: number; points: number }[] }) {
  if (points.length === 0) return null;
  const w = 220;
  const h = 48;
  const max = Math.max(1, ...points.map((p) => p.points));
  const min = Math.min(0, ...points.map((p) => p.points));
  const range = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p.points - min) / range) * (h - 6) - 3;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={`0,${h} ${coords.map(([x, y]) => `${x},${y}`).join(" ")} ${w},${h}`}
        fill="#5a719c22"
        stroke="none"
      />
      <path d={path} fill="none" stroke="#d9a441" strokeWidth={2} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="#d9a441" />
      ))}
    </svg>
  );
}
