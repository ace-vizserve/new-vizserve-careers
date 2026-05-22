import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { ChevronRight, User, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  reviewed:    "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-rose-50 text-rose-600 border-rose-200",
  hired:       "bg-purple-50 text-purple-700 border-purple-200",
};

export default async function SharedCandidatesPage() {
  const guard = await requireRole("guest");
  if (!guard.ok) redirect("/admin/login");

  const admin = createAdminClient();
  const { data: shares } = await admin
    .from("guest_shares")
    .select(
      "id, created_at, applications ( id, full_name, email, status, jobs ( position_name ) )",
    )
    .eq("guest_user_id", guard.session.userId)
    .order("created_at", { ascending: false });

  const rows = (shares ?? []).filter((s: any) => s.applications);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4258A5]" />
          <h1 className="text-2xl font-bold text-slate-900">Shared Candidates</h1>
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          Candidates shared with you for interview ({rows.length} total)
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold">Nothing shared with you yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Candidates will appear here once HR shares them with you.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Applied For</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((s: any) => {
                const app = s.applications;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{app.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{app.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-slate-700 font-medium">
                        {app.jobs?.position_name ?? "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${STATUS_STYLES[app.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/shared/${app.id}`}
                          title="View candidate"
                          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] transition-all">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
