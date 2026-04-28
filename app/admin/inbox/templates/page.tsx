import { FileText } from "lucide-react";
import { PhasePlaceholder } from "../_components/PhasePlaceholder";

export default function TemplatesPage() {
  return (
    <PhasePlaceholder
      title="Manage Templates"
      description="Reusable email templates with candidate variable substitution (e.g. {{candidate.full_name}}) will be managed here."
      phase="Phase 4"
      Icon={FileText}
    />
  );
}
