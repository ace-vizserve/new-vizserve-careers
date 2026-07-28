"use client";

import { NO_APP_ACCESS_MESSAGE, hasAppAccess } from "@/lib/app-access";
import { createClient } from "@/lib/client";
import { Briefcase, ChevronRight, Contact, LogOut, Mail, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (pathname !== "/admin/login") router.replace("/admin/login");
        setChecking(false);
        return;
      }
      // A session from a sibling VizServe app is still a session — the
      // app_access tag is what decides whether it belongs in this dashboard.
      if (!hasAppAccess(user)) {
        setDenied(true);
        setChecking(false);
        return;
      }
      // Resolve the account's role. No profile row → treat as a plain HR user.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const resolvedRole = profile?.role ?? "hr";
      setRole(resolvedRole);
      // Each role is confined to its own area:
      //   superadmin → /admin/accounts   guest → /admin/shared   hr → everything else
      const allowed =
        resolvedRole === "superadmin"
          ? pathname.startsWith("/admin/accounts")
          : resolvedRole === "guest"
            ? pathname.startsWith("/admin/applications")
            : !pathname.startsWith("/admin/accounts");
      if (!allowed) {
        router.replace(
          resolvedRole === "superadmin"
            ? "/admin/accounts"
            : resolvedRole === "guest"
              ? "/admin/applications"
              : "/admin/jobs",
        );
      }
      setChecking(false);
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-[#4258A5] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (denied) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <h1 className="text-lg font-bold text-slate-900">No access</h1>
        <p className="text-sm text-slate-500 mt-2">{NO_APP_ACCESS_MESSAGE}</p>
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-3 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ backgroundColor: '#4258A5' }}>
          Sign in with a different account
        </button>
      </div>
    </div>
  );

  // Each role gets its own sidebar: superadmin → Accounts, guest →
  // Shared Candidates, HR → the full recruiting set.
  const navItems =
    role === "superadmin"
      ? [{ href: "/admin/accounts", label: "Accounts", Icon: UserCog }]
      : role === "guest"
        ? [{ href: "/admin/applications", label: "Applications", Icon: Users }]
        : [
            { href: "/admin/jobs",         label: "Job Postings", Icon: Briefcase },
            { href: "/admin/applications", label: "Applications", Icon: Users     },
            { href: "/admin/candidates",   label: "Candidates",   Icon: Contact   },
            { href: "/admin/inbox",        label: "Inbox",        Icon: Mail      },
          ];

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4258A5' }}>
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">VizServe</p>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                style={active ? { backgroundColor: '#4258A5' } : {}}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all mb-1">
            ← View live site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}