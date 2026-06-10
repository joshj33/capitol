import Link from "next/link";
import { getQueries } from "@/lib/data";
import { Avatar, PartyChip, officeLabel } from "@/components/ui";

export default async function PlayersPage() {
  const q = await getQueries();
  const ranked = q.getFiguresRanked();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-gov-400">
          Every figure in the pool, ranked by season fantasy points. Free agents
          can be added via waivers.
        </p>
      </header>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gov-400">
            <tr className="border-b border-ink-line">
              <th className="p-3">#</th>
              <th className="p-3">Figure</th>
              <th className="p-3">Office</th>
              <th className="hidden p-3 sm:table-cell">Owner</th>
              <th className="p-3 text-right">Season pts</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ figure, total }, i) => {
              const owner = q.teamOf(figure.id);
              return (
                <tr key={figure.id} className="border-b border-ink-line/50 last:border-0">
                  <td className="p-3 text-gov-400">{i + 1}</td>
                  <td className="p-3">
                    <Link
                      href={`/players/${figure.slug}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Avatar name={figure.fullName} size={32} />
                      <span>
                        {figure.fullName} <PartyChip abbr={q.getPartyAbbr(figure.partyId)} />
                        <span className="block text-xs text-gov-400">{figure.state}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-gov-100">{officeLabel(figure.office)}</td>
                  <td className="hidden p-3 sm:table-cell">
                    {owner ? (
                      <span className="text-gov-100">
                        {owner.logoEmoji} {owner.name}
                      </span>
                    ) : (
                      <span className="chip bg-good/15 text-good">free agent</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
