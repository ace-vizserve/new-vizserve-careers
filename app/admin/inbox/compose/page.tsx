import { Plus } from "lucide-react";
import { PhasePlaceholder } from "../_components/PhasePlaceholder";

export default function ComposePage() {
  return (
    <PhasePlaceholder
      title="Compose"
      description="A composer that sends through Microsoft Graph as the shared recruiting mailbox lands here."
      phase="Phase 2 · next up"
      Icon={Plus}
    />
  );
}
