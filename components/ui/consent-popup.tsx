"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  storageKey?: string;
}

export function ConsentPopup({ storageKey = "vizserve_consent_ack" }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const acknowledged = window.sessionStorage.getItem(storageKey);
    if (!acknowledged) setOpen(true);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleAcknowledge();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAcknowledge = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-popup-title">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-7 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4 mb-5">
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200"
            style={{ backgroundColor: "#4258A5" }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2 id="consent-popup-title" className="text-lg font-semibold text-slate-900 leading-tight">
              Notice on Personal Data Collection
            </h2>
            <p className="text-xs text-slate-400 mt-1">Please review before proceeding with your application</p>
          </div>
        </div>

        <div className="text-sm text-slate-600 leading-relaxed space-y-3 mb-6">
          <p>
            By continuing with this application, you acknowledge that the information you provide — including your
            personal details, contact information, and supporting documents — will be{" "}
            <span className="font-medium text-slate-800">collected, stored, and processed</span> by Vizserve for the
            purpose of evaluating your job application.
          </p>
          <p>
            Your data will be handled confidentially and used solely in connection with the recruitment and selection
            process. You may withdraw your consent at any time by contacting{" "}
            <a
              href="mailto:recruitment@viszerve.com"
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
              recruitment@viszerve.com
            </a>
            .
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#4258A5" }}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
