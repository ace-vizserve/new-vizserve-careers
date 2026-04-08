"use client";

import { Briefcase, Eye, EyeOff, Pencil, Plus, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Job {
  id: number;
  position_name: string;
  location: string;
  employment_type: string;
  contract_details: string;
  is_remote: boolean;
  is_active: boolean;
  urgently_hiring: boolean;
  org_name: string;
  created_at: string;
}

const STATUS_COLORS = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function AdminJobsPage() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/jobs");
    const data = await res.json();
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  const toggleActive = async (job: Job) => {
    await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !job.is_active }),
    });
    fetchJobs();
  };

  const deleteJob = async (id: number) => {
    if (!confirm("Delete this job posting? This cannot be undone.")) return;
    await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    fetchJobs();
  };

  const formatType = (contractDetails: string, employmentType: string) => {
    const raw = contractDetails || employmentType || "Full-Time";
    return raw.replace(/_/g, "-").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Postings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {jobs.filter(j => j.is_active).length} active · {jobs.filter(j => !j.is_active).length} inactive
          </p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: '#4258A5' }}>
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#4258A5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold mb-1">No job postings yet</p>
          <p className="text-slate-400 text-sm mb-6">Create your first job to get started</p>
          <Link
            href="/admin/jobs/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl"
            style={{ backgroundColor: '#4258A5' }}>
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{job.position_name}</span>
                      {job.urgently_hiring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ backgroundColor: '#E8EEF7', borderColor: '#C5D5ED', color: '#4258A5' }}>
                          <Zap className="w-2.5 h-2.5" /> Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{job.org_name}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-slate-600">{formatType(job.contract_details, job.employment_type)}</span>
                    {job.is_remote && <span className="ml-2 text-xs text-[#4258A5] font-semibold">Remote</span>}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-slate-500">{job.location || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${job.is_active ? STATUS_COLORS.active : STATUS_COLORS.inactive}`}>
                      {job.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(job)}
                        title={job.is_active ? "Deactivate" : "Activate"}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all">
                        {job.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <Link
                        href={`/admin/jobs/${job.id}/edit`}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="p-2 rounded-lg border border-rose-100 text-rose-400 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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