"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

/**
 * Interview-notes editor on the guest's shared-candidate page.
 * Each guest keeps one note per candidate; saving upserts it.
 */
export function GuestNotes({ applicationId }: { applicationId: number }) {
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/guest/notes?applicationId=${applicationId}`);
      if (res.ok) {
        const data = await res.json();
        setNote(data.note?.note ?? "");
      }
      setLoaded(true);
    })();
  }, [applicationId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/guest/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        sileo.error({ title: data.error ?? "Failed to save notes" });
        return;
      }
      sileo.success({ title: "Interview notes saved" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        My Interview Notes
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={!loaded}
        placeholder="Write your interview feedback for this candidate…"
        rows={6}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5] resize-y"
      />
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !loaded}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#4258A5" }}>
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
