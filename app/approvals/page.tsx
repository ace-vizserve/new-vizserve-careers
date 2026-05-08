import { ApprovalForm } from "./ApprovalForm";

export const metadata = {
  title: "New approval request",
};

export default function ApprovalsPage() {
  return (
    <div
      className="min-h-screen bg-slate-50 py-10 px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">New approval request</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit a request for approval. Approvers will be notified via SharePoint and Power Automate.
          </p>
        </header>
        <ApprovalForm />
      </div>
    </div>
  );
}
