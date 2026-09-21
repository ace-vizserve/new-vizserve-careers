"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  ArrowLeft,
  Download,
  FileArchive,
  FileImage,
  FileText,
  FileType,
  Paperclip,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizeEmailHtml } from "@/lib/sanitize-email-html";
import { sileo } from "sileo";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
}

interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
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
  attachments: Attachment[];
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
          <div className="w-full px-6 py-6 space-y-1">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {startsNewDay(messages[i - 1], msg) && <DayDivider iso={msg.created_at} />}
                <MessageBubble
                  message={msg}
                  /* Consecutive messages from the same side read as one turn —
                     only the first of a run carries the avatar and name. */
                  showAvatar={!sameSideAsPrevious(messages[i - 1], msg)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3">
        {/* Matches the message column above it. */}
        <div className="w-full">
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

function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
        {formatDayLabel(iso)}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

/**
 * One message in the conversation stream. Everything is always visible —
 * no expand/collapse — so the thread reads top to bottom like a chat.
 */
function MessageBubble({
  message,
  showAvatar,
}: {
  message: Message;
  showAvatar: boolean;
}) {
  const isOutbound = message.direction === "outbound";
  const senderLabel = isOutbound ? "You" : message.from_address;
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Mail bodies are whole HTML documents whose <style> rules would otherwise
  // restyle the admin UI around them. Parsing isn't free on a long thread, so
  // each body is cleaned once.
  const bodyHtml = useMemo(
    () => (message.body_html ? sanitizeEmailHtml(message.body_html) : ""),
    [message.body_html],
  );

  return (
    <div className={`flex gap-2.5 py-1 ${isOutbound ? "flex-row-reverse" : "flex-row"}`}>
      {/* The avatar column keeps its width on follow-ups so a run stays aligned. */}
      <div className="flex-shrink-0 w-8">
        {showAvatar && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ backgroundColor: isOutbound ? "#4258A5" : "#94a3b8" }}
            title={senderLabel}>
            {initials(senderLabel)}
          </div>
        )}
      </div>

      <div
        className={`min-w-0 max-w-[calc(100%-2.5rem)] flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
        {showAvatar && (
          <p className="text-[11px] text-slate-500 mb-1 px-1 truncate max-w-full">{senderLabel}</p>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 border shadow-sm max-w-full ${
            isOutbound
              ? "bg-[#4258A5]/[0.07] border-[#4258A5]/20 rounded-tr-sm"
              : "bg-white border-slate-200 rounded-tl-sm"
          }`}>
          {bodyHtml ? (
            /* The `!` matters: Outlook pastes screenshots as
               <img style="max-width: 1488px">, and an inline style outranks
               any class rule, so without it the image renders at its own size
               and gets clipped at the edge of the message. */
            <div
              className="rich-text text-sm break-words overflow-x-auto [&_img]:my-2 [&_img]:!max-w-full [&_img]:!h-auto [&_table]:!max-w-full"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
              {message.body_text?.trim() || "(no body)"}
            </div>
          )}

          {message.attachments?.length > 0 && (
            <AttachmentList attachments={message.attachments} />
          )}
        </div>

        <p className="text-[11px] text-slate-400 mt-1 px-1">{time}</p>
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-200/70">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1.5">
        <Paperclip className="w-3 h-3" />
        {attachments.length} {attachments.length === 1 ? "attachment" : "attachments"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((att) => (
          <AttachmentChip key={att.id} attachment={att} />
        ))}
      </div>
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const Icon = attachmentIcon(attachment.content_type, attachment.filename);
  const isImage = attachment.content_type.startsWith("image/");
  const href = `/api/inbox/attachments/${attachment.id}`;

  return (
    <div className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#4258A5]/40 hover:bg-slate-50 transition-colors max-w-full">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={href} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-slate-100" />
      ) : (
        <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
        title={attachment.filename}>
        <p className="text-xs font-medium text-slate-700 truncate max-w-[180px]">
          {attachment.filename}
        </p>
        <p className="text-[10px] text-slate-400">{formatBytes(attachment.size_bytes)}</p>
      </a>

      <a
        href={`${href}?download=1`}
        download={attachment.filename}
        className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-[#4258A5] hover:bg-[#4258A5]/10 transition-colors"
        aria-label={`Download ${attachment.filename}`}>
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function attachmentIcon(contentType: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType === "application/pdf" || ext === "pdf") return FileType;
  if (/zip|rar|7z|tar|gzip/.test(contentType) || ["zip", "rar", "7z"].includes(ext)) {
    return FileArchive;
  }
  return FileText;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function startsNewDay(prev: Message | undefined, current: Message): boolean {
  if (!prev) return true;
  return (
    new Date(prev.created_at).toDateString() !== new Date(current.created_at).toDateString()
  );
}

function sameSideAsPrevious(prev: Message | undefined, current: Message): boolean {
  if (!prev) return false;
  if (prev.direction !== current.direction) return false;
  // A gap of more than an hour reads as a new turn, so re-show the avatar.
  const gap = new Date(current.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap < 60 * 60 * 1000;
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dayDiff = Math.round(
    (new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000,
  );
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
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
