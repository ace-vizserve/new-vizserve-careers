"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, FileText, Save, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
}

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTo = searchParams.get("to") ?? "";
  const initialName = searchParams.get("name") ?? "";
  const applicationIdParam = searchParams.get("applicationId") ?? "";
  const draftIdParam = searchParams.get("draftId") ?? "";

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [signatureHtml, setSignatureHtml] = useState("");
  const [applicationId, setApplicationId] = useState<string>(applicationIdParam);
  const [draftId, setDraftId] = useState<string | null>(draftIdParam || null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [userTouched, setUserTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Load templates list (for the picker dropdown).
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inbox/templates");
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
    })();
  }, []);

  // Initial setup: either load a draft (if ?draftId=) or prefill the active signature.
  useEffect(() => {
    (async () => {
      if (draftIdParam) {
        const res = await fetch(`/api/inbox/drafts/${draftIdParam}`);
        if (res.ok) {
          const { draft } = await res.json();
          setTo(draft.to_address ?? "");
          setSubject(draft.subject ?? "");
          setBodyHtml(draft.body_html ?? plainTextToHtml(draft.body ?? ""));
          setApplicationId(draft.application_id ? String(draft.application_id) : "");
          setUserTouched(true);
          return;
        }
      }
      // No draft → prefill with active signature.
      const res = await fetch("/api/inbox/signatures/active");
      if (!res.ok) return;
      const data = await res.json();
      const sigHtml = (data.signature?.body_html ?? "").trim();
      const sigText = (data.signature?.body ?? "").trim();
      const resolvedSig = sigHtml || (sigText ? plainTextToHtml(sigText) : "");
      if (resolvedSig) {
        setSignatureHtml(resolvedSig);
        setBodyHtml(`<p></p>${resolvedSig}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplateNow = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (tpl.subject) setSubject(tpl.subject);
    const tplHtml = tpl.body_html ?? plainTextToHtml(tpl.body);
    setBodyHtml(signatureHtml ? `${tplHtml}<p></p>${signatureHtml}` : tplHtml);
    setActiveTemplateId(templateId);
    setUserTouched(false);
  };

  const requestApplyTemplate = (templateId: string) => {
    if (!templateId) return;
    if (!userTouched && !activeTemplateId) {
      applyTemplateNow(templateId);
      return;
    }
    setPendingTemplateId(templateId);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload = { to, subject, body: htmlToPlainText(bodyHtml), bodyHtml, applicationId };
      const url = draftId ? `/api/inbox/drafts/${draftId}` : "/api/inbox/drafts";
      const method = draftId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({ title: data.error ?? "Failed to save draft" });
        return;
      }
      if (!draftId && data.id) setDraftId(data.id);
      sileo.success({ title: "Draft saved" });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) return sileo.error({ title: "Recipient is required" });
    if (!subject.trim()) return sileo.error({ title: "Subject is required" });
    if (htmlIsEmpty(bodyHtml)) return sileo.error({ title: "Message body is required" });

    setSending(true);
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, bodyHtml, applicationId }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({
          title: result.error ?? "Failed to send email",
          description: result.details,
        });
        return;
      }

      // Successfully sent — drop any existing draft.
      if (draftId) {
        await fetch(`/api/inbox/drafts/${draftId}`, { method: "DELETE" });
      }

      sileo.success({ title: "Email sent" });
      router.push("/admin/inbox");
    } catch (err: any) {
      sileo.error({ title: "Failed to send email", description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="flex-shrink-0 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <Link
          href="/admin/inbox"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Back to inbox">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900">
            {draftId ? "Continue draft" : "New Message"}
          </h1>
          {initialName && (
            <p className="text-xs text-slate-500 truncate">
              Replying to {initialName}
              {applicationId && <span className="text-slate-400"> · application #{applicationId}</span>}
            </p>
          )}
        </div>

        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <select
              onChange={(e) => {
                requestApplyTemplate(e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5]">
              <option value="" disabled>
                Use a template…
              </option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Field label="To">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5]"
            />
          </Field>

          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5]"
            />
          </Field>

          <Field label="Message">
            <RichTextEditor
              value={bodyHtml}
              onChange={(html) => {
                setBodyHtml(html);
                setUserTouched(true);
              }}
              placeholder="Write your message..."
              minHeight="280px"
            />
          </Field>
        </div>
      </div>

      <footer className="flex-shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-2">
        <button
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          <Save className="w-3.5 h-3.5" />
          {savingDraft ? "Saving..." : draftId ? "Update draft" : "Save draft"}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/inbox"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </Link>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#4258A5" }}>
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={pendingTemplateId !== null}
        title="Replace current message?"
        description={
          <TemplateSwitchDescription
            currentName={templates.find((t) => t.id === activeTemplateId)?.name ?? null}
            newName={templates.find((t) => t.id === pendingTemplateId)?.name ?? "(unknown)"}
          />
        }
        confirmLabel="Use template"
        cancelLabel="Keep my message"
        onConfirm={() => {
          if (pendingTemplateId) applyTemplateNow(pendingTemplateId);
          setPendingTemplateId(null);
        }}
        onCancel={() => setPendingTemplateId(null)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function htmlIsEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length === 0;
}

function plainTextToHtml(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`)
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

function TemplateSwitchDescription({
  currentName,
  newName,
}: {
  currentName: string | null;
  newName: string;
}) {
  return (
    <div>
      <p className="mb-3">Your current message will be replaced. Confirm the switch:</p>
      <div className="flex items-stretch gap-2 text-xs">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-400 uppercase tracking-wide mb-1">From</p>
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 break-words">
            <span className="text-slate-700">
              {currentName ?? <em className="text-slate-500">Custom message</em>}
            </span>
          </div>
        </div>
        <span className="self-center text-slate-300 text-base">→</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-400 uppercase tracking-wide mb-1">To</p>
          <div className="px-3 py-2 rounded-lg border break-words" style={{ backgroundColor: "#4258A511", borderColor: "#4258A540" }}>
            <span className="text-slate-900 font-medium">{newName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
