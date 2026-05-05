"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, FileText, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  created_at: string;
  is_read: boolean;
}

interface Thread {
  id: string;
  application_id: number | null;
  participant_email: string;
  subject: string;
  last_message_at: string;
  applications?: { id: number; full_name: string; email: string } | null;
}

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyHtml, setReplyHtml] = useState("");
  const [signaturePrefill, setSignaturePrefill] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load shared templates for the dropdown.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inbox/templates");
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
    })();
  }, []);

  const applyTemplateNow = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const tplHtml = tpl.body_html ?? plainTextToHtml(tpl.body);
    setReplyHtml(signaturePrefill ? `${tplHtml}${signaturePrefill}` : tplHtml);
    setActiveTemplateId(templateId);
  };

  const requestApplyTemplate = (templateId: string) => {
    if (!templateId) return;
    // If reply is empty (or only the signature prefill is there), apply directly.
    if (htmlIsEmpty(replyHtml) || replyHtml === signaturePrefill) {
      applyTemplateNow(templateId);
      return;
    }
    setPendingTemplateId(templateId);
  };

  // Load active signature once and prefill the reply box.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inbox/signatures/active");
      if (!res.ok) return;
      const data = await res.json();
      const sigHtml = (data.signature?.body_html ?? "").trim();
      const sigText = (data.signature?.body ?? "").trim();
      let prefill = "";
      if (sigHtml) {
        prefill = `<p></p>${sigHtml}`;
      } else if (sigText) {
        const escaped = sigText
          .split("\n")
          .map((l: string) => `<p>${l || "<br>"}</p>`)
          .join("");
        prefill = `<p></p>${escaped}`;
      }
      if (prefill) {
        setSignaturePrefill(prefill);
        setReplyHtml(prefill);
      }
    })();
  }, []);

  const load = async () => {
    const res = await fetch(`/api/inbox/threads/${threadId}`);
    if (!res.ok) {
      sileo.error({ title: "Failed to load thread" });
      router.push("/admin/inbox");
      return;
    }
    const data = await res.json();
    setThread(data.thread);
    setMessages(data.messages ?? []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleReply = async () => {
    if (!thread) return;
    if (htmlIsEmpty(replyHtml)) return;
    setSending(true);
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: thread.participant_email,
          subject: thread.subject?.startsWith("Re:") ? thread.subject : `Re: ${thread.subject || "(no subject)"}`,
          bodyHtml: replyHtml,
          applicationId: thread.application_id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        sileo.error({
          title: result.error ?? "Failed to send",
          description: result.details,
        });
        return;
      }
      // Reset the reply box but keep the signature prefilled for the next message.
      setReplyHtml(signaturePrefill);
      setActiveTemplateId(null);
      sileo.success({ title: "Reply sent" });
      await load();
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  if (!thread) return null;

  const candidate = thread.applications;
  const displayName = candidate?.full_name ?? thread.participant_email;

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
          <h1 className="text-base font-semibold text-slate-900 truncate">
            {thread.subject || "(no subject)"}
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {displayName} · {thread.participant_email}
            {candidate && (
              <span className="ml-2 text-slate-400">· application #{candidate.id}</span>
            )}
          </p>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-400">No messages yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <li key={msg.id}>
                <MessageRow message={msg} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3">
        <div className="max-h-72 overflow-y-auto">
          <RichTextEditor
            value={replyHtml}
            onChange={setReplyHtml}
            placeholder={`Reply to ${displayName}...`}
            minHeight="80px"
          />
        </div>
        <div className="mt-2 flex items-center justify-end">
          <button
            onClick={handleReply}
            disabled={sending || htmlIsEmpty(replyHtml)}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#4258A5" }}>
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={pendingTemplateId !== null}
        title="Replace current reply?"
        description={
          <TemplateSwitchDescription
            currentName={templates.find((t) => t.id === activeTemplateId)?.name ?? null}
            newName={templates.find((t) => t.id === pendingTemplateId)?.name ?? "(unknown)"}
          />
        }
        confirmLabel="Use template"
        cancelLabel="Keep my reply"
        onConfirm={() => {
          if (pendingTemplateId) applyTemplateNow(pendingTemplateId);
          setPendingTemplateId(null);
        }}
        onCancel={() => setPendingTemplateId(null)}
      />
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";
  const senderLabel = isOutbound ? "You" : message.from_address;
  const time = new Date(message.created_at).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="bg-white px-6 py-5 hover:bg-slate-50/40 transition-colors">
      <header className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: isOutbound ? "#4258A5" : "#94a3b8" }}>
          {initials(senderLabel)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {senderLabel}
              {isOutbound && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: "#4258A5" }}>
                  Sent
                </span>
              )}
            </p>
            <span className="flex-shrink-0 text-xs text-slate-400">{time}</span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            To: {message.to_address}
          </p>
        </div>
      </header>
      {message.body_html ? (
        <div
          className="rich-text text-sm break-words pl-12 [&_img]:my-2 [&_img]:max-h-32"
          dangerouslySetInnerHTML={{ __html: message.body_html }}
        />
      ) : (
        <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed pl-12">
          {message.body_text?.trim() || "(no body)"}
        </div>
      )}
    </article>
  );
}

function htmlIsEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
}

function plainTextToHtml(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`)
    .join("");
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
      <p className="mb-3">Your current reply will be replaced. Confirm the switch:</p>
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

function initials(label: string): string {
  if (label === "You") return "ME";
  const local = label.split("@")[0] ?? label;
  const parts = local.split(/[._-\s]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
