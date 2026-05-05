"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface SentMessage {
  id: string;
  thread_id: string;
  to_address: string;
  subject: string;
  body_text: string | null;
  created_at: string;
}

export default function SentPage() {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/inbox/sent");
      if (!res.ok) {
        sileo.error({ title: "Failed to load sent messages" });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading sent...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">Sent</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-10">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <Send className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No sent messages yet</h2>
              <p className="text-sm text-slate-500">
                Emails you send to candidates will show up here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <li key={msg.id}>
                <Link
                  href={`/admin/inbox/${msg.thread_id}`}
                  className="block px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      To: {msg.to_address}
                    </p>
                    <span className="flex-shrink-0 text-xs text-slate-400">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 truncate">{msg.subject || "(no subject)"}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {snippet(msg.body_text)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function snippet(text: string | null): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
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
