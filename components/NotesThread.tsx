"use client";

import { Check, Pencil, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Note {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
  updated_at: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "?").toUpperCase();
}

/**
 * Threaded interview notes for a candidate. HR and the guest both post
 * here; everyone can edit or delete their own notes.
 */
export function NotesThread({ applicationId }: { applicationId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/notes?applicationId=${applicationId}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes ?? []);
      setCurrentUserId(data.currentUserId ?? null);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const post = async () => {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({ title: data.error ?? "Failed to post note" });
        return;
      }
      setNotes((prev) => [...prev, data.note]);
      setDraft("");
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (id: string) => {
    const text = editBody.trim();
    if (!text) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({ title: data.error ?? "Failed to save note" });
        return;
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? data.note : n)));
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      sileo.error({ title: "Failed to delete note" });
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        Interview Notes
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400">No notes yet — start the thread below.</p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const mine = note.author_id === currentUserId;
            const isGuest = note.author_role === "guest";
            const edited = note.updated_at !== note.created_at;
            return (
              <div key={note.id} className="flex gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ backgroundColor: isGuest ? "#94a3b8" : "#4258A5" }}>
                  {initials(note.author_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {note.author_name || "Unknown"}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: isGuest ? "#e2e8f0" : "#4258A5",
                        color: isGuest ? "#475569" : "#fff",
                      }}>
                      {isGuest ? "Guest" : "HR"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTime(note.created_at)}
                      {edited && " · edited"}
                    </span>
                    {mine && editingId !== note.id && (
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(note.id);
                            setEditBody(note.body);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          aria-label="Edit note">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(note.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          aria-label="Delete note">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  {editingId === note.id ? (
                    <div className="mt-1.5 space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5] resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(note.id)}
                          disabled={savingEdit}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                          style={{ backgroundColor: "#4258A5" }}>
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5">
                      {note.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an interview note…"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5] resize-y"
        />
        <div className="flex justify-end">
          <button
            onClick={post}
            disabled={posting || !draft.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#4258A5" }}>
            <Send className="w-4 h-4" />
            {posting ? "Posting…" : "Post note"}
          </button>
        </div>
      </div>
    </div>
  );
}
