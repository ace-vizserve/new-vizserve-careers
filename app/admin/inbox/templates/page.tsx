"use client";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
  updated_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const load = async () => {
    const res = await fetch("/api/inbox/templates");
    if (!res.ok) {
      sileo.error({ title: "Failed to load templates" });
      return [];
    }
    const data = await res.json();
    const list: Template[] = data.templates ?? [];
    setTemplates(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      const list = await load();
      if (list.length > 0) {
        setSelectedId(list[0].id);
        setDraftName(list[0].name);
        setDraftSubject(list[0].subject);
        setDraftHtml(list[0].body_html ?? "");
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftSubject(selected.subject);
      setDraftHtml(selected.body_html ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleCreate = async () => {
    const res = await fetch("/api/inbox/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled template", subject: "", body: "", body_html: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      sileo.error({ title: data.error ?? "Failed to create" });
      return;
    }
    await load();
    setSelectedId(data.template.id);
    setDraftName(data.template.name);
    setDraftSubject(data.template.subject);
    setDraftHtml(data.template.body_html ?? "");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inbox/templates/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          subject: draftSubject,
          body: htmlToPlainText(draftHtml),
          body_html: draftHtml,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        sileo.error({ title: err.error ?? "Failed to save" });
        return;
      }
      sileo.success({ title: "Template saved" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This affects everyone in your team.")) return;
    const res = await fetch(`/api/inbox/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      sileo.error({ title: "Failed to delete" });
      return;
    }
    const next = await load();
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading templates...
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <aside className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Templates</h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white rounded hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#4258A5" }}>
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <li className="p-6 text-center text-xs text-slate-400">
              No templates yet. Click <strong>New</strong> to add one.
            </li>
          ) : (
            templates.map((tpl) => (
              <li
                key={tpl.id}
                onClick={() => setSelectedId(tpl.id)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 ${
                  tpl.id === selectedId ? "bg-slate-100" : "hover:bg-slate-50"
                }`}>
                <p className="text-sm font-medium text-slate-900 truncate">{tpl.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {tpl.subject || "(no subject)"}
                </p>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex-1 flex flex-col">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Select a template to edit, or click <strong className="ml-1">New</strong> to create one.
          </div>
        ) : (
          <>
            <header className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Template name"
                className="text-base font-semibold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 px-0 w-72"
              />
              <button
                onClick={() => handleDelete(selected.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Subject
                </label>
                <input
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  placeholder="e.g. Interview invitation"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Body
                </label>
                <RichTextEditor
                  value={draftHtml}
                  onChange={setDraftHtml}
                  placeholder="Hi {name},..."
                  minHeight="280px"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Templates are shared with the whole team. Anyone composing or replying can pick this template.
                </p>
              </div>
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

function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim();
}
