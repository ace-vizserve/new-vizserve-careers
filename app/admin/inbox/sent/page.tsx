import { Send } from "lucide-react";
import { PhasePlaceholder } from "../_components/PhasePlaceholder";

export default function SentPage() {
  return (
    <PhasePlaceholder
      title="Sent"
      description="Email sent from the shared recruiting mailbox will appear here."
      phase="Phase 3 · not yet wired"
      Icon={Send}
    />
  );
}
