"use client";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Signature {
  id: string;
  name: string;
  body: string;
  body_html: string | null;
  is_active: boolean;
  updated_at: string;
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = signatures.find((s) => s.id === selectedId) ?? null;

  const load = async () => {
    const res = await fetch("/api/inbox/signatures");
    if (!res.ok) {
      sileo.error({ title: "Failed to load signatures" });
      return [];
    }
    const data = await res.json();
    const list: Signature[] = data.signatures ?? [];
    setSignatures(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      const list = await load();
      if (list.length > 0) {
        const active = list.find((s) => s.is_active) ?? list[0];
        setSelectedId(active.id);
        setDraftName(active.name);
        setDraftHtml(active.body_html ?? plainTextToHtml(active.body));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftHtml(selected.body_html ?? plainTextToHtml(selected.body));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleCreate = async () => {
    const res = await fetch("/api/inbox/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled signature", body: "", body_html: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      sileo.error({ title: data.error ?? "Failed to create" });
      return;
    }
    await load();
    setSelectedId(data.signature.id);
    setDraftName(data.signature.name);
    setDraftHtml(data.signature.body_html ?? "");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inbox/signatures/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          body: htmlToPlainText(draftHtml),
          body_html: draftHtml,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        sileo.error({ title: err.error ?? "Failed to save" });
        return;
      }
      sileo.success({ title: "Signature saved" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/inbox/signatures/${id}/activate`, { method: "POST" });
    if (!res.ok) {
      sileo.error({ title: "Failed to activate" });
      return;
    }
    sileo.success({ title: "Active signature updated" });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this signature?")) return;
    const res = await fetch(`/api/inbox/signatures/${id}`, { method: "DELETE" });
    if (!res.ok) {
      sileo.error({ title: "Failed to delete" });
      return;
    }
    const next = await load();
    if (selectedId === id) {
      const fallback = next[0] ?? null;
      setSelectedId(fallback?.id ?? null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading signatures...
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <aside className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Signatures</h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white rounded hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#4258A5" }}>
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {signatures.length === 0 ? (
            <li className="p-6 text-center text-xs text-slate-400">
              No signatures yet. Click <strong>New</strong> to add one.
            </li>
          ) : (
            signatures.map((sig) => (
              <li
                key={sig.id}
                onClick={() => setSelectedId(sig.id)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 ${
                  sig.id === selectedId ? "bg-slate-100" : "hover:bg-slate-50"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">{sig.name}</p>
                  {sig.is_active && (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: "#4258A5" }}>
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {(sig.body || htmlToPlainText(sig.body_html ?? "")).slice(0, 60) || "(empty)"}
                </p>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex-1 flex flex-col">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Select a signature to edit, or click <strong className="ml-1">New</strong> to create one.
          </div>
        ) : (
          <>
            <header className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Signature name"
                className="text-base font-semibold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 px-0 w-72"
              />
              <div className="flex items-center gap-2">
                {!selected.is_active && (
                  <button
                    onClick={() => handleActivate(selected.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                    Set as active
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Signature content
              </label>
              <RichTextEditor
                value={draftHtml}
                onChange={setDraftHtml}
                placeholder="Best regards, ..."
                minHeight="240px"
              />
              <p className="text-xs text-slate-500 mt-2">
                Use the toolbar to format text or add a logo. Active signature is pre-filled when you compose or reply.
              </p>
            </div>

            <footer className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#4258A5" }}>
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function plainTextToHtml(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`)
    .join("");
}

function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim();
}
