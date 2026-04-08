"use client";

import { Briefcase, ChevronRight, Search, Star, StarOff, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PooledApplication {
  id: number;
  job_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  status: string;
  expected_salary: string;
  expected_salary_currency: string;
  years_of_experience: string;
  created_at: string;
  jobs: { position_name: string; org_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  reviewed:    "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-rose-50 text-rose-600 border-rose-200",
  hired:       "bg-purple-50 text-purple-700 border-purple-200",
  dropped:     "bg-orange-50 text-orange-600 border-orange-200",
};

export default function AdminPoolingPage() {
  const [apps, setApps] = useState<PooledApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPooled = async () => {
    setLoading(true);
    const res = await fetch("/api/applications?pooled=true");
    const data = await res.json();
    setApps(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchPooled(); }, []);

  const removeFromPool = async (id: number) => {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pooled: false }),
    });
    setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = apps.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.jobs?.position_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h1 className="text-2xl font-bold text-slate-900">Pooling Candidates</h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Candidates saved for future opportunities ({apps.length} total)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, position..."
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#4258A5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Star className="w-6 h-6 text-amber-300" />
          </div>
          <p className="text-slate-600 font-semibold">No pooled candidates</p>
          <p className="text-slate-400 text-sm mt-1">
            Add candidates to the pool from the application pipeline
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Applied For</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Experience</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Status</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{app.full_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{app.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-slate-700 font-medium">{app.jobs?.position_name ?? "—"}</p>
                    <p className="text-xs text-slate-400">{app.jobs?.org_name}</p>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {app.years_of_experience && (
                      <p className="text-slate-600">{app.years_of_experience} yrs</p>
                    )}
                    {app.expected_salary && (
                      <p className="text-xs text-slate-400">
                        {app.expected_salary_currency} {app.expected_salary}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${STATUS_STYLES[app.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => removeFromPool(app.id)}
                        title="Remove from pool"
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      >
                        <StarOff className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/admin/applications/${app.id}`}
                        title="View application"
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
