import { Inbox } from "lucide-react";
import { PhasePlaceholder } from "./_components/PhasePlaceholder";

export default function InboxPage() {
  return (
    <PhasePlaceholder
      title="Inbox"
      description="Incoming candidate replies for the shared recruiting mailbox will land here once the Microsoft Graph integration is wired up."
      phase="Phase 3 · not yet wired"
      Icon={Inbox}
    />
  );
}
