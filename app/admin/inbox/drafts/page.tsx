import { FileClock } from "lucide-react";
import { PhasePlaceholder } from "../_components/PhasePlaceholder";

export default function DraftsPage() {
  return (
    <PhasePlaceholder
      title="Drafts"
      description="Saved drafts from the shared recruiting mailbox will appear here."
      phase="Phase 3 · not yet wired"
      Icon={FileClock}
    />
  );
}
