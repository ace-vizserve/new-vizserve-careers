"use client";

import { FileClock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Draft {
  id: string;
  application_id: number | null;
  to_address: string;
  subject: string;
  body: string;
  body_html: string | null;
  updated_at: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/inbox/drafts");
    if (!res.ok) {
      sileo.error({ title: "Failed to load drafts" });
      return;
    }
    const data = await res.json();
    setDrafts(data.drafts ?? []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this draft?")) return;
    const res = await fetch(`/api/inbox/drafts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      sileo.error({ title: "Failed to delete" });
      return;
    }
    await load();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading drafts...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">Drafts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="h-full flex items-center justify-center p-10">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <FileClock className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No drafts yet</h2>
              <p className="text-sm text-slate-500">
                Drafts you save from the compose screen will show up here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/admin/inbox/compose?draftId=${draft.id}`}
                  className="flex items-start gap-3 px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileClock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {draft.to_address ? `To: ${draft.to_address}` : "(no recipient)"}
                      </p>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {formatDate(draft.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 truncate mt-0.5">
                      {draft.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {snippet(draft.body)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(draft.id, e)}
                    className="flex-shrink-0 p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete draft">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function snippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
