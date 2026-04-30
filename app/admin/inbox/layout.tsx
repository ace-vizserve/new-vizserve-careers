"use client";

import {
  FileClock,
  FileText,
  Inbox,
  PenLine,
  Plus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const primary = [
    { href: "/admin/inbox",        label: "Inbox",  Icon: Inbox,     exact: true },
    { href: "/admin/inbox/sent",   label: "Sent",   Icon: Send,      exact: false },
    { href: "/admin/inbox/drafts", label: "Drafts", Icon: FileClock, exact: false },
  ];

  // Email Integrations is hidden — page still exists at /admin/inbox/integrations.
  const secondary = [
    { href: "/admin/inbox/templates", label: "Manage Templates", Icon: FileText },
    { href: "/admin/inbox/signature", label: "Signature",        Icon: PenLine  },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="px-4 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 px-2">Inbox</h2>
        </div>

        <div className="px-4 pt-4">
          <Link
            href="/admin/inbox/compose"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#4258A5" }}>
            <Plus className="w-4 h-4" />
            Compose
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          {primary.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 space-y-1 ${secondary.length > 0 ? "border-t border-slate-100" : ""}`}>
          {secondary.map(({ href, label, Icon }) => {
            const active = isActive(href, false);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>

      <section className="flex-1 overflow-auto">{children}</section>
    </div>
  );
}
