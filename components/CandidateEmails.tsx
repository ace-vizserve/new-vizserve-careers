"use client";

import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Thread {
  id: string;
  subject: string;
  participant_email: string;
  last_message_at: string;
  unread_count: number;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * HR-only: pulls the email threads exchanged with this candidate from
 * the recruiting inbox. Loads on demand via the button.
 */
export function CandidateEmails({ applicationId }: { applicationId: number }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox/candidate?applicationId=${applicationId}`);
      const data = await res.json().catch(() => ({}));
      setThreads(res.ok ? (data.threads ?? []) : []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Emails
        </p>
        {threads === null && (
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] transition-colors disabled:opacity-50">
            <Mail className="w-3.5 h-3.5" />
            {loading ? "Loading…" : "Load email history"}
          </button>
        )}
      </div>

      {threads !== null &&
        (threads.length === 0 ? (
          <p className="text-sm text-slate-400">
            No emails exchanged with this candidate yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/inbox/${t.id}`}
                  className="flex items-center gap-3 py-2.5 group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-[#4258A5] transition-colors">
                      {t.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {t.participant_email}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {t.unread_count > 0 && (
                      <span className="text-[10px] font-bold text-white bg-[#4258A5] rounded-full px-1.5 py-0.5">
                        {t.unread_count}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatTime(t.last_message_at)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#4258A5] transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
