"use client";

import { Check, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sileo } from "sileo";

interface Guest {
  user_id: string;
  display_name: string | null;
  email: string;
}
interface Share {
  id: string;
  guest_user_id: string;
}

/**
 * Controlled share dialog. Render it when you want it open; call
 * `onClose` to dismiss. Used directly from menus, and wrapped by
 * `ShareToGuestButton` for the simple button case.
 */
export function ShareToGuestDialog({
  applicationId,
  onClose,
}: {
  applicationId: number;
  onClose: () => void;
}) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [gRes, sRes] = await Promise.all([
          fetch("/api/guests"),
          fetch(`/api/shares?applicationId=${applicationId}`),
        ]);
        const gData = await gRes.json().catch(() => ({}));
        const sData = await sRes.json().catch(() => ({}));
        if (gRes.ok) setGuests(gData.guests ?? []);
        else sileo.error({ title: gData.error ?? "Failed to load guests" });
        if (sRes.ok) setShares(sData.shares ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId]);

  const shareFor = (guestUserId: string) =>
    shares.find((s) => s.guest_user_id === guestUserId) ?? null;

  const toggle = async (guest: Guest) => {
    const existing = shareFor(guest.user_id);
    setBusyId(guest.user_id);
    try {
      if (existing) {
        const res = await fetch(`/api/shares/${existing.id}`, { method: "DELETE" });
        if (!res.ok) {
          sileo.error({ title: "Failed to un-share" });
          return;
        }
        setShares((prev) => prev.filter((s) => s.id !== existing.id));
      } else {
        const res = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, guestUserId: guest.user_id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          sileo.error({ title: data.error ?? "Failed to share" });
          return;
        }
        setShares((prev) => [...prev, { id: data.share.id, guest_user_id: guest.user_id }]);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-slate-900">Share to guest account</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Guests see this candidate only after you share it. Tap a guest to share
          or un-share.
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No guest accounts exist yet.
          </div>
        ) : (
          <ul className="space-y-1 max-h-72 overflow-y-auto">
            {guests.map((g) => {
              const shared = !!shareFor(g.user_id);
              return (
                <li key={g.user_id}>
                  <button
                    onClick={() => toggle(g)}
                    disabled={busyId === g.user_id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                      shared
                        ? "border-[#4258A5]/40 bg-[#4258A5]/5"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {g.display_name || g.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{g.email}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center border ${
                        shared
                          ? "bg-[#4258A5] border-[#4258A5] text-white"
                          : "border-slate-300"
                      }`}>
                      {shared && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * HR control: a button that opens the share dialog.
 * `variant="icon"` renders a compact icon button (table rows);
 * `variant="button"` renders a labelled button (detail header).
 */
export function ShareToGuestButton({
  applicationId,
  variant = "button",
}: {
  applicationId: number;
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          title="Share to guest account"
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] transition-all">
          <Share2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] transition-all">
          <Share2 className="w-3.5 h-3.5" /> Share to guest
        </button>
      )}

      {open && (
        <ShareToGuestDialog
          applicationId={applicationId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
