"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, X, Loader2 } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { Approver, ApprovalStage, GraphUser } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHIP_COLORS = [
  "bg-teal-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-rose-500",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length];
}

function initialsOf(approver: Approver) {
  const source = approver.displayName?.trim() || approver.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ApproverRow({
  stage,
  index,
  showNumber,
  canRemove,
  dragHandleProps,
  onChange,
  onRemove,
}: {
  stage: ApprovalStage;
  index: number;
  showNumber: boolean;
  canRemove: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onChange: (stage: ApprovalStage) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GraphUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced Graph search.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/graph/users?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(Array.isArray(data.users) ? data.users : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const isDuplicate = (email: string) =>
    stage.approvers.some((a) => a.email.toLowerCase() === email.toLowerCase());

  const addApprover = (approver: Approver) => {
    if (!approver.email || isDuplicate(approver.email)) return;
    onChange({ ...stage, approvers: [...stage.approvers, approver] });
    setQuery("");
    setResults([]);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeApproverAt = (idx: number) => {
    onChange({ ...stage, approvers: stage.approvers.filter((_, i) => i !== idx) });
  };

  const handleBlur = () => {
    const trimmed = query.trim();
    if (trimmed && EMAIL_RE.test(trimmed)) {
      addApprover({ email: trimmed, displayName: trimmed });
    }
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="flex items-start gap-2">
      <div
        {...(dragHandleProps as React.HTMLAttributes<HTMLDivElement>)}
        className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing pt-3"
        aria-label="Drag to reorder stage"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {showNumber && (
        <div className="mt-2.5 flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold flex-shrink-0">
          {index + 1}
        </div>
      )}
      <div ref={containerRef} className="relative flex-1">
        <div
          onClick={focusInput}
          className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-2 py-1.5 rounded-md border border-slate-200 bg-white focus-within:border-[#4258A5] focus-within:ring-2 focus-within:ring-[#4258A5]/15 transition-all cursor-text"
        >
          {stage.approvers.map((approver, idx) => (
            <span
              key={`${approver.email}-${idx}`}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-full pl-1 pr-1.5 py-1 text-sm transition-colors group"
            >
              <span
                className={`w-6 h-6 rounded-full ${colorFor(approver.email)} text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0`}
              >
                {initialsOf(approver)}
              </span>
              <span className="truncate max-w-[160px] text-slate-800">
                {approver.displayName || approver.email}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeApproverAt(idx);
                }}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                aria-label={`Remove ${approver.displayName || approver.email}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            placeholder={stage.approvers.length === 0 ? "Search by name or email" : ""}
            className="flex-1 min-w-[140px] outline-none text-sm bg-transparent h-7"
          />
        </div>
        {open && (loading || results.length > 0 || query.trim()) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching...
              </div>
            )}
            {!loading && results.length === 0 && query.trim() && (
              <div className="px-3 py-2 text-xs text-slate-400">
                {EMAIL_RE.test(query.trim())
                  ? "No directory match — click outside to use this email"
                  : "No matches"}
              </div>
            )}
            {!loading &&
              results.map((user) => {
                const already = isDuplicate(user.email);
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={already}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      addApprover({ email: user.email, displayName: user.displayName })
                    }
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${colorFor(user.email)} text-white flex items-center justify-center text-xs font-semibold flex-shrink-0`}
                    >
                      {initialsOf({ email: user.email, displayName: user.displayName })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    {already && (
                      <span className="text-xs text-slate-400">added</span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove stage"
        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1.5 mt-2.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
