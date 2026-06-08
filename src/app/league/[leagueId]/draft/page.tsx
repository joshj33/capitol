import { getAllFigures } from "@/lib/data";
import { parties } from "@/lib/seed";
import { DraftRoom } from "@/components/DraftRoom";

export default function DraftPage() {
  // Pass plain serializable seed data into the interactive client component.
  return <DraftRoom figures={getAllFigures()} parties={parties} />;
}
