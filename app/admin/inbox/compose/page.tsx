"use client";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTo = searchParams.get("to") ?? "";
  const initialName = searchParams.get("name") ?? "";
  const applicationId = searchParams.get("applicationId") ?? "";

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Prefill the body with the active signature so the user can edit before sending.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inbox/signatures/active");
      if (!res.ok) return;
      const data = await res.json();
      const sigHtml = (data.signature?.body_html ?? "").trim();
      const sigText = (data.signature?.body ?? "").trim();
      if (sigHtml) {
        setBodyHtml(`<p></p>${sigHtml}`);
      } else if (sigText) {
        const escaped = sigText
          .split("\n")
          .map((l: string) => `<p>${l || "<br>"}</p>`)
          .join("");
        setBodyHtml(`<p></p>${escaped}`);
      }
    })();
  }, []);

  const handleSend = async () => {
    if (!to.trim()) {
      sileo.error({ title: "Recipient is required" });
      return;
    }
    if (!subject.trim()) {
      sileo.error({ title: "Subject is required" });
      return;
    }
    if (!htmlIsEmpty(bodyHtml)) {
      // Body has content — proceed.
    } else {
      sileo.error({ title: "Message body is required" });
      return;
    }

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

      sileo.success({ title: "Email sent" });
      router.push("/admin/inbox");
    } catch (err: any) {
      sileo.error({
        title: "Failed to send email",
        description: err.message,
      });
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
        <div className="flex-1">
          <h1 className="text-base font-semibold text-slate-900">New Message</h1>
          {initialName && (
            <p className="text-xs text-slate-500">
              Replying to {initialName}
              {applicationId && <span className="text-slate-400"> · application #{applicationId}</span>}
            </p>
          )}
        </div>
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
              onChange={setBodyHtml}
              placeholder="Write your message..."
              minHeight="280px"
            />
          </Field>
        </div>
      </div>

      <footer className="flex-shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
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
      </footer>
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
  // Strip tags + whitespace + non-breaking spaces; if nothing's left, it's empty.
  const stripped = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
}
