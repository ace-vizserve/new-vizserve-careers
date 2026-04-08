"use client";

import { Briefcase, ChevronRight, MapPin, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Job {
  id: number;
  position_name: string;
  org_name: string;
  location: string;
  is_active: boolean;
  salary_min: string;
  salary_max: string;
  currency: string;
  created_at: string;
}

interface ApplicationCount {
  job_id: number;
  total: number;
  by_status: Record<string, number>;
}

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700",
  reviewed:    "bg-blue-50 text-blue-700",
  shortlisted: "bg-emerald-50 text-emerald-700",
  rejected:    "bg-rose-50 text-rose-600",
  hired:       "bg-purple-50 text-purple-700",
};

export default function AdminApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Map<number, ApplicationCount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/admin/jobs"),
        fetch("/api/applications"),
      ]);
      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();

      setJobs(Array.isArray(jobsData) ? jobsData : []);

      // Build counts per job
      const map = new Map<number, ApplicationCount>();
      if (Array.isArray(appsData)) {
        for (const app of appsData) {
          const jid = app.job_id;
          if (!map.has(jid)) map.set(jid, { job_id: jid, total: 0, by_status: {} });
          const entry = map.get(jid)!;
          entry.total++;
          entry.by_status[app.status] = (entry.by_status[app.status] ?? 0) + 1;
        }
      }
      setCounts(map);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.position_name.toLowerCase().includes(q) ||
      j.org_name?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Select a job to view its application pipeline
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
            placeholder="Search position, client, location..."
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
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold">No jobs found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job) => {
            const count = counts.get(job.id);
            const total = count?.total ?? 0;
            const byStatus = count?.by_status ?? {};

            return (
              <Link
                key={job.id}
                href={`/admin/applications/job/${job.id}`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-[#4258A5]/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Left: Job info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-[#4258A5] transition-colors">
                        {job.position_name}
                      </h3>
                      {!job.is_active && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{job.org_name}</span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.salary_min && job.salary_max && (
                        <span>
                          {job.currency} {job.salary_min} - {job.salary_max}
                        </span>
                      )}
                    </div>

                    {/* Status pills */}
                    {total > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {Object.entries(byStatus).map(([status, num]) => (
                          <span
                            key={status}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${STATUS_STYLES[status] ?? "bg-slate-50 text-slate-500"}`}
                          >
                            {num} {status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Count + arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      {total}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#4258A5] transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
