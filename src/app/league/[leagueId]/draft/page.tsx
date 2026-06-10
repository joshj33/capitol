import { getQueries } from "@/lib/data";
import { DraftRoom } from "@/components/DraftRoom";

export default async function DraftPage() {
  const q = await getQueries();
  // Pass plain serializable data into the interactive client component.
  return <DraftRoom figures={q.getAllFigures()} parties={q.getParties()} />;
}
