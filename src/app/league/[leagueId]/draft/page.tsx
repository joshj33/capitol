import Link from "next/link";
import { redirect } from "next/navigation";
import { getQueries } from "@/lib/data";
import { DraftRoom } from "@/components/DraftRoom";

export default async function DraftPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const q = await getQueries();
  const live = q.meta.source === "supabase";

  // The seed demo is open to everyone; on a real backing store, drafting is
  // gated to members of the league.
  if (live && !q.canManageLeague()) {
    if (!q.getViewerUserId()) {
      redirect(`/login?next=${encodeURIComponent(`/league/${params.leagueId}/draft`)}`);
    }
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Draft room</h1>
        <div className="card mt-4 border-dashed">
          <p className="text-sm text-gov-100">
            You&apos;re not a member of this league, so you can&apos;t draft here.
            Ask the commissioner for an invite, or head back to your own league.
          </p>
          <Link href="/" className="btn-ghost mt-4">
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  // Pass plain serializable data into the interactive client component.
  return <DraftRoom figures={q.getAllFigures()} parties={q.getParties()} />;
}
