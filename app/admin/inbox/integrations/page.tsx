import { Settings } from "lucide-react";
import { PhasePlaceholder } from "../_components/PhasePlaceholder";

export default function IntegrationsPage() {
  return (
    <PhasePlaceholder
      title="Email Integrations"
      description="Connect the shared recruiting mailbox via Microsoft Graph (Azure app registration + admin consent). Status, scopes, and re-auth controls will live here."
      phase="Phase 2 · next up"
      Icon={Settings}
    />
  );
}
