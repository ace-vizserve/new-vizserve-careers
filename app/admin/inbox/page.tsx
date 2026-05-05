"use client";

import { ChevronLeft, ChevronRight, Inbox as InboxIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface ThreadRow {
  id: string;
  application_id: number | null;
  participant_email: string;
  subject: string;
  last_message_at: string;
  unread_count: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function InboxPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadThreads = async (nextPage = page, nextSize = pageSize) => {
    const res = await fetch(`/api/inbox/threads?page=${nextPage}&pageSize=${nextSize}`);
    if (!res.ok) {
      sileo.error({ title: "Failed to load inbox" });
      return;
    }
    const data = await res.json();
    setThreads(data.threads ?? []);
    setTotal(data.total ?? 0);
  };

  useEffect(() => {
    loadThreads(page, pageSize).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        sileo.error({
          title: "Sync failed",
          description: result.details ?? result.error,
        });
        return;
      }
      sileo.success({
        title: "Inbox synced",
        description: `${result.inserted} new, ${result.skipped} already known`,
      });
      await loadThreads(1, pageSize);
      setPage(1);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading inbox...
      </div>
    );
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="flex-shrink-0 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Inbox</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} {total === 1 ? "conversation" : "conversations"}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        {threads.length === 0 ? (
          <div className="h-full flex items-center justify-center p-10">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <InboxIcon className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No conversations yet</h2>
              <p className="text-sm text-slate-500">
                Conversations show up here once you send an email to a candidate or one replies to you.
                Click <span className="font-medium">Sync</span> to pull in any incoming replies.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={`/admin/inbox/${thread.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {initials(thread.participant_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {thread.participant_email}
                      </p>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {formatDate(thread.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {thread.subject || "(no subject)"}
                    </p>
                  </div>
                  {thread.unread_count > 0 && (
                    <span
                      className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: "#4258A5" }}>
                      {thread.unread_count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize">Results per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5]">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {rangeStart}–{rangeEnd} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function initials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
