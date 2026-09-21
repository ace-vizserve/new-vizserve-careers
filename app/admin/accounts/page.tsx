"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/client";
import { Mail, Pencil, Plus, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

type Role = "superadmin" | "hr" | "guest";

interface Account {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: Role;
  mailbox_upn: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Superadmin",
  hr: "HR",
  guest: "Guest",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  // Form: null = closed, otherwise create or edit mode.
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields.
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mailboxUpn, setMailboxUpn] = useState("");
  const [role, setRole] = useState<Role>("guest");

  const load = async () => {
    const res = await fetch("/api/admin/accounts");
    if (!res.ok) {
      sileo.error({ title: "Failed to load accounts" });
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts ?? []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    createClient()
      .auth.getUser()
      .then(({ data }) => setSelfUserId(data.user?.id ?? null));
  }, []);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setMailboxUpn("");
    setRole("guest");
  };

  const openEdit = (acc: Account) => {
    setFormMode("edit");
    setEditingId(acc.id);
    setDisplayName(acc.display_name ?? "");
    setEmail(acc.email);
    setPassword("");
    setMailboxUpn(acc.mailbox_upn ?? "");
    setRole(acc.role);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res =
        formMode === "create"
          ? await fetch("/api/admin/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, displayName, password, mailboxUpn, role }),
            })
          : await fetch(`/api/admin/accounts/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ displayName, mailboxUpn, role, password }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({ title: data.error ?? "Failed to save account" });
        return;
      }
      sileo.success({
        title: formMode === "create" ? "Account created" : "Account updated",
      });
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (acc: Account) => {
    const res = await fetch(`/api/admin/accounts/${acc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !acc.is_active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      sileo.error({ title: data.error ?? "Failed to update account" });
      return;
    }
    await load();
  };

  const handleDelete = async (acc: Account) => {
    const res = await fetch(`/api/admin/accounts/${acc.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      sileo.error({ title: data.error ?? "Failed to delete account" });
      return;
    }
    sileo.success({ title: "Account deleted" });
    await load();
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none " +
    "focus:ring-2 focus:ring-[#4258A5]/20 focus:border-[#4258A5] disabled:bg-slate-50 disabled:text-slate-400";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Loading accounts...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create and manage guest and HR accounts.
            </p>
          </div>
          {!formMode && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#4258A5" }}>
              <Plus className="w-4 h-4" />
              New account
            </button>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {formMode === "create" ? "New account" : "Edit account"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Dela Cruz"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Login email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@vizserve.com"
                  required
                  disabled={formMode === "edit"}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  {formMode === "create" ? "Temporary password" : "New password"}
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    formMode === "create"
                      ? "At least 8 characters"
                      : "Leave blank to keep current"
                  }
                  required={formMode === "create"}
                  minLength={8}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className={inputCls}>
                  <option value="guest">Guest — 2nd-stage interviewer</option>
                  <option value="hr">HR — full recruiting access</option>
                  {formMode === "edit" && (
                    <option value="superadmin">Superadmin — account management</option>
                  )}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Mailbox (Microsoft 365)
                </label>
                <input
                  type="email"
                  value={mailboxUpn}
                  onChange={(e) => setMailboxUpn(e.target.value)}
                  placeholder="jane@vizserve.com"
                  className={inputCls}
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              The mailbox is the Microsoft 365 inbox this account works from — it can
              be left blank and set later.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#4258A5" }}>
                {saving
                  ? "Saving..."
                  : formMode === "create"
                    ? "Create account"
                    : "Save changes"}
              </button>
            </div>
          </form>
        )}

        {/* Account list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {accounts.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No accounts yet.
            </div>
          ) : (
            accounts.map((acc) => {
              const isSelf = acc.user_id === selfUserId;
              return (
                <div key={acc.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{
                      backgroundColor:
                        acc.role === "superadmin" ? "#4258A5" : "#94a3b8",
                    }}>
                    {acc.role === "superadmin" ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <UserCog className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {acc.display_name || acc.email}
                      </p>
                      <span
                        className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            acc.role === "superadmin" ? "#4258A5" : "#e2e8f0",
                          color: acc.role === "superadmin" ? "#fff" : "#475569",
                        }}>
                        {ROLE_LABEL[acc.role]}
                      </span>
                      {isSelf && (
                        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          You
                        </span>
                      )}
                      {!acc.is_active && (
                        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-100 text-rose-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{acc.email}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      {acc.mailbox_upn || "No mailbox set"}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(acc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    {!isSelf && (
                      <>
                        <button
                          onClick={() => toggleActive(acc)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                          {acc.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => setPendingDelete(acc)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          aria-label="Delete account">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this account?"
        description={
          <span>
            <strong>{pendingDelete?.display_name || pendingDelete?.email}</strong> will
            lose access permanently. This cannot be undone.
          </span>
        }
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        variant="danger"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
