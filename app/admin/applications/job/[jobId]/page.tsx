"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Briefcase,
  Check,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  RotateCcw,
  Star,
  StarOff,
  User,
  UserX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderResumePageOneToPng } from "./lib/render-pdf-page";

/* ── Types ─────────────────────────────────────────────── */

interface Job {
  id: number;
  position_name: string;
  org_name: string;
  location: string;
  salary_min: string;
  salary_max: string;
  currency: string;
  is_active: boolean;
}

interface Application {
  id: number;
  job_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  status: string;
  expected_salary: string;
  expected_salary_currency: string;
  years_of_experience: string;
  created_at: string;
  drop_reason?: string;
  drop_details?: string;
  is_pooled?: boolean;
  resume_url?: string | null;
  face_image_url?: string | null;
  archived_at?: string | null;
  archive_reason?: string | null;
  archive_details?: string | null;
}

/** Return up to 2 uppercase initials for the kanban avatar fallback. */
function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Toast {
  id: number;
  message: string;
  type: "loading" | "success" | "error";
}

/* ── Pipeline stages ───────────────────────────────────── */

const STAGES = [
  "new_candidates",
  "paper_screening",
  "for_examination",
  "initial_interview",
  "rc_bc",
  "second_stage_interview",
  "final_stage_interview",
  "offered",
  "to_onboard",
  "started",
  "regularization",
] as const;

const STAGE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  new_candidates:         { label: "New Candidates",    color: "text-amber-700",    bg: "bg-amber-50",    border: "border-amber-200",    dot: "bg-amber-400"    },
  paper_screening:        { label: "Paper Screening",   color: "text-blue-700",     bg: "bg-blue-50",     border: "border-blue-200",     dot: "bg-blue-400"     },
  for_examination:        { label: "For Examination",   color: "text-indigo-700",   bg: "bg-indigo-50",   border: "border-indigo-200",   dot: "bg-indigo-400"   },
  initial_interview:      { label: "Initial Interview", color: "text-cyan-700",     bg: "bg-cyan-50",     border: "border-cyan-200",     dot: "bg-cyan-400"     },
  rc_bc:                  { label: "RC/BC",             color: "text-teal-700",     bg: "bg-teal-50",     border: "border-teal-200",     dot: "bg-teal-400"     },
  second_stage_interview: { label: "2nd Interview",     color: "text-sky-700",      bg: "bg-sky-50",      border: "border-sky-200",      dot: "bg-sky-400"      },
  final_stage_interview:  { label: "Final Interview",   color: "text-violet-700",   bg: "bg-violet-50",   border: "border-violet-200",   dot: "bg-violet-400"   },
  offered:                { label: "Offered",           color: "text-orange-700",   bg: "bg-orange-50",   border: "border-orange-200",   dot: "bg-orange-400"   },
  to_onboard:             { label: "To Onboard",        color: "text-emerald-700",  bg: "bg-emerald-50",  border: "border-emerald-200",  dot: "bg-emerald-400"  },
  started:                { label: "Started",           color: "text-green-700",    bg: "bg-green-50",    border: "border-green-200",    dot: "bg-green-400"    },
  regularization:         { label: "Regularization",    color: "text-purple-700",   bg: "bg-purple-50",   border: "border-purple-200",   dot: "bg-purple-400"   },
};

const DROP_REASONS = [
  "Not qualified",
  "Failed interview",
  "Candidate withdrew",
  "Position filled",
  "Salary mismatch",
  "No show",
  "Failed background check",
  "Other",
];

const ARCHIVE_REASONS = [
  "Position no longer available",
  "Long-term inactive candidate",
  "Records keeping",
  "Re-applied / superseded",
  "Other",
];

/* ── Helper: group applications by status ──────────────── */

function groupByStatus(apps: Application[]) {
  const map: Record<string, Application[]> = {};
  for (const s of STAGES) map[s] = [];
  const dropped: Application[] = [];

  for (const app of apps) {
    if (app.status === "dropped") {
      dropped.push(app);
    } else {
      const bucket = map[app.status] ?? map["new_candidates"];
      bucket.push(app);
    }
  }
  return { columns: map, dropped };
}

/* ── Toast Component ───────────────────────────────────── */

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            t.type === "loading"
              ? "bg-white border-slate-200 text-slate-700"
              : t.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {t.type === "loading" && <Loader2 className="w-4 h-4 animate-spin text-[#4258A5]" />}
          {t.type === "success" && <Check className="w-4 h-4" />}
          {t.type === "error" && <X className="w-4 h-4" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── 3-dot Context Menu ────────────────────────────────── */

function CardMenu({
  app,
  onDrop,
  onArchive,
  onPool,
  onUnpool,
}: {
  app: Application;
  onDrop: (app: Application) => void;
  onArchive: (app: Application) => void;
  onPool: (app: Application) => void;
  onUnpool: (app: Application) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1">
          {app.is_pooled ? (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onUnpool(app); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <StarOff className="w-3.5 h-3.5 text-slate-400" />
              Remove from Pool
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onPool(app); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              Add to Pooling
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDrop(app); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            Drop
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onArchive(app); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Drop Reason Modal ─────────────────────────────────── */

function DropModal({
  app,
  onClose,
  onConfirm,
}: {
  app: Application;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDrop = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onConfirm(reason, details);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reason to drop</h2>
            <p className="text-xs text-slate-400 mt-0.5">Dropping {app.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Select the drop reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all"
            >
              <option value="">Select the drop reason</option>
              {DROP_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Details (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add more details for your reason here (Optional)"
              rows={5}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDrop}
            disabled={!reason || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Dropping..." : "Drop"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Archive Reason Modal ──────────────────────────────── */

function ArchiveModal({
  app,
  onClose,
  onConfirm,
}: {
  app: Application;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleArchive = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onConfirm(reason, details);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
              <Archive className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reason to archive</h2>
              <p className="text-xs text-slate-400 mt-0.5">Archiving {app.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Select the archive reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all"
            >
              <option value="">Select the archive reason</option>
              {ARCHIVE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Comment (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add a comment explaining why this candidate is being archived (Optional)"
              rows={5}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleArchive}
            disabled={!reason || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Reason Modal (shared by Drop + Archive) ──────── */

function EditReasonModal({
  app,
  kind,
  initialReason,
  initialDetails,
  onClose,
  onConfirm,
}: {
  app: Application;
  kind: "drop" | "archive";
  initialReason: string;
  initialDetails: string;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);
  const [details, setDetails] = useState(initialDetails);
  const [submitting, setSubmitting] = useState(false);

  const isArchive = kind === "archive";
  const reasons = isArchive ? ARCHIVE_REASONS : DROP_REASONS;
  const accent = isArchive ? "bg-slate-700 hover:bg-slate-800" : "bg-rose-500 hover:bg-rose-600";
  const Icon = isArchive ? Archive : AlertCircle;
  const title = isArchive ? "Edit archive reason" : "Edit drop reason";
  const reasonLabel = isArchive ? "Archive reason" : "Drop reason";

  // If the existing reason isn't in the canonical list (legacy / freeform),
  // surface it as a selectable option so the editor doesn't lose it.
  const reasonOptions = reasons.includes(initialReason) || !initialReason
    ? reasons
    : [initialReason, ...reasons];

  const handleSave = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onConfirm(reason, details);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Updating {app.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {reasonLabel}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all"
            >
              <option value="">Select a reason</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Comment (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add or update the comment (Optional)"
              rows={5}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!reason || submitting}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${accent}`}
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dropped Applicants Modal ──────────────────────────── */

function DroppedModal({
  apps,
  onClose,
  onRestore,
  onPool,
  onUnpool,
  onArchive,
  onEdit,
}: {
  apps: Application[];
  onClose: () => void;
  onRestore: (app: Application) => void;
  onPool: (app: Application) => void;
  onUnpool: (app: Application) => void;
  onArchive: (app: Application) => void;
  onEdit: (app: Application) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
              <UserX className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dropped Applicants</h2>
              <p className="text-xs text-slate-400">{apps.length} candidate{apps.length !== 1 ? "s" : ""} dropped</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <UserX className="w-8 h-8 mb-2" />
              <p className="text-sm text-slate-400">No dropped applicants</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-[#4258A5] transition-colors"
                    >
                      {app.full_name}
                    </Link>
                    <p className="text-[11px] text-slate-400 truncate">{app.email}</p>
                    {app.drop_reason && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                          {app.drop_reason}
                        </span>
                        {app.drop_details && (
                          <p className="text-[10px] text-slate-400 truncate max-w-48">
                            {app.drop_details}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onEdit(app)}
                      title="Edit drop reason"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] hover:bg-blue-50/50 transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => onRestore(app)}
                      title="Restore to pipeline"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] hover:bg-blue-50/50 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                    {app.is_pooled ? (
                      <button
                        onClick={() => onUnpool(app)}
                        title="Remove from pool"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all"
                      >
                        <StarOff className="w-3 h-3" />
                        Unpool
                      </button>
                    ) : (
                      <button
                        onClick={() => onPool(app)}
                        title="Add to pooling for future"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      >
                        <Star className="w-3 h-3" />
                        Add to Pool
                      </button>
                    )}
                    <button
                      onClick={() => onArchive(app)}
                      title="Move to archive"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Archived Applicants Modal ─────────────────────────── */

function ArchivedModal({
  apps,
  onClose,
  onUnarchive,
  onEdit,
}: {
  apps: Application[];
  onClose: () => void;
  onUnarchive: (app: Application) => void;
  onEdit: (app: Application) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
              <Archive className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Archived Applicants</h2>
              <p className="text-xs text-slate-400">
                {apps.length} archived
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <Archive className="w-8 h-8 mb-2" />
              <p className="text-sm text-slate-400">No archived applicants</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-[#4258A5] transition-colors"
                    >
                      {app.full_name}
                    </Link>
                    <p className="text-[11px] text-slate-400 truncate">{app.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {app.archived_at && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Archived {new Date(app.archived_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {app.archive_reason && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                          {app.archive_reason}
                        </span>
                      )}
                    </div>
                    {app.archive_details && (
                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                        {app.archive_details}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onEdit(app)}
                      title="Edit archive reason"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] hover:bg-blue-50/50 transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => onUnarchive(app)}
                      title="Restore from archive"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#4258A5] hover:text-[#4258A5] hover:bg-blue-50/50 transition-all"
                    >
                      <ArchiveRestore className="w-3 h-3" />
                      Unarchive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function JobPipelinePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [columns, setColumns] = useState<Record<string, Application[]>>({});
  const [droppedApps, setDroppedApps] = useState<Application[]>([]);
  const [archivedApps, setArchivedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [dropTarget, setDropTarget] = useState<Application | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Application | null>(null);
  const [editTarget, setEditTarget] = useState<{ app: Application; kind: "drop" | "archive" } | null>(null);
  const [showDroppedModal, setShowDroppedModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type !== "loading") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reload = async () => {
    const [jobRes, appsRes, archivedRes] = await Promise.all([
      fetch(`/api/admin/jobs/${jobId}`),
      fetch(`/api/applications?job_id=${jobId}`),
      fetch(`/api/applications?job_id=${jobId}&archived=true`),
    ]);
    const jobData = await jobRes.json();
    const appsData = await appsRes.json();
    const archivedData = await archivedRes.json();

    setJob(jobData);
    const { columns: cols, dropped } = groupByStatus(
      Array.isArray(appsData) ? appsData : []
    );
    setColumns(cols);
    setDroppedApps(dropped);
    setArchivedApps(Array.isArray(archivedData) ? archivedData : []);
  };

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  /* ── Background face detection ──────────────────────────
     After applications load, look for any that have a resume but no
     face_image_url yet, and ask the server to detect a face for each.
     Runs sequentially to avoid hammering Roboflow / the PDF renderer.
     When a face comes back, patch it into the kanban columns live. */
  useEffect(() => {
    const all = [
      ...Object.values(columns).flat(),
      ...droppedApps,
    ];
    const needsDetection = all.filter(
      (a) => a.resume_url && !a.face_image_url
    );
    if (needsDetection.length === 0) return;

    let cancelled = false;

    const applyFace = (appId: number, faceUrl: string) => {
      setColumns((prev) => {
        const next: Record<string, Application[]> = {};
        for (const [col, items] of Object.entries(prev)) {
          next[col] = items.map((a) =>
            a.id === appId ? { ...a, face_image_url: faceUrl } : a
          );
        }
        return next;
      });
      setDroppedApps((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, face_image_url: faceUrl } : a
        )
      );
    };

    (async () => {
      for (const app of needsDetection) {
        if (cancelled) return;
        if (!app.resume_url) continue;
        try {
          // Render page 1 of the PDF to a PNG here in the browser. pdfjs
          // runs natively in browsers, so this sidesteps all the Node /
          // Turbopack / Windows pdfjs-in-server headaches.
          const pngBlob = await renderResumePageOneToPng(app.resume_url);
          if (cancelled) return;

          const formData = new FormData();
          formData.append("page_image", pngBlob, "page.png");

          const res = await fetch(
            `/api/applications/${app.id}/detect-face`,
            { method: "POST", body: formData }
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (!cancelled && data?.face_image_url) {
            applyFace(app.id, data.face_image_url);
          }
        } catch {
          /* silent — leaving initials is a fine fallback */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the set of ids missing a face changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Object.values(columns)
      .flat()
      .filter((a) => a.resume_url && !a.face_image_url)
      .map((a) => a.id)
      .join(","),
  ]);

  /* ── Drag handler ────────────────────────────────────── */

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    const next = { ...columns };
    const srcItems = [...(next[srcCol] ?? [])];
    const dstItems = srcCol === dstCol ? srcItems : [...(next[dstCol] ?? [])];

    const [moved] = srcItems.splice(source.index, 1);
    if (!moved) return;
    moved.status = dstCol;
    dstItems.splice(destination.index, 0, moved);

    next[srcCol] = srcItems;
    next[dstCol] = dstItems;
    setColumns(next);

    if (srcCol !== dstCol) {
      await fetch(`/api/applications/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dstCol }),
      });
    }
  };

  /* ── Actions ─────────────────────────────────────────── */

  const handleDrop = async (reason: string, details: string) => {
    if (!dropTarget) return;
    const loadingId = addToast(`Dropping ${dropTarget.full_name}...`, "loading");

    const res = await fetch(`/api/applications/${dropTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "dropped",
        drop_reason: reason,
        drop_details: details,
      }),
    });
    const result = await res.json();
    removeToast(loadingId);

    if (!res.ok) {
      addToast(`Failed to drop: ${result.error ?? "Unknown error"}`, "error");
      return;
    }

    setDropTarget(null);
    addToast(`${dropTarget.full_name} has been dropped`, "success");
    await reload();
  };

  const handleArchive = async (reason: string, details: string) => {
    if (!archiveTarget) return;
    const loadingId = addToast(`Archiving ${archiveTarget.full_name}...`, "loading");

    const res = await fetch(`/api/applications/${archiveTarget.id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archive_reason: reason,
        archive_details: details,
      }),
    });
    removeToast(loadingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      addToast(`Failed to archive: ${err.error ?? "Unknown error"}`, "error");
      return;
    }

    const name = archiveTarget.full_name;
    setArchiveTarget(null);
    addToast(`${name} moved to archive`, "success");
    await reload();
  };

  const handleUnarchive = async (app: Application) => {
    const loadingId = addToast(`Restoring ${app.full_name}...`, "loading");

    const res = await fetch(`/api/applications/${app.id}/unarchive`, { method: "POST" });
    removeToast(loadingId);

    if (!res.ok) {
      addToast("Failed to restore applicant", "error");
      return;
    }

    addToast(`${app.full_name} restored from archive`, "success");
    await reload();
  };

  const handlePool = async (app: Application) => {
    const loadingId = addToast(`Adding ${app.full_name} to pool...`, "loading");
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pooled: true }),
    });
    removeToast(loadingId);
    addToast(`${app.full_name} added to pool`, "success");
    await reload();
  };

  const handleUnpool = async (app: Application) => {
    const loadingId = addToast(`Removing ${app.full_name} from pool...`, "loading");
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pooled: false }),
    });
    removeToast(loadingId);
    addToast(`${app.full_name} removed from pool`, "success");
    await reload();
  };

  const handleRestore = async (app: Application) => {
    const loadingId = addToast(`Restoring ${app.full_name}...`, "loading");
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "new_candidates",
        drop_reason: null,
        drop_details: null,
      }),
    });
    removeToast(loadingId);
    addToast(`${app.full_name} restored to pipeline`, "success");
    await reload();
  };

  const handleEditReason = async (reason: string, details: string) => {
    if (!editTarget) return;
    const { app, kind } = editTarget;
    const loadingId = addToast(`Updating ${app.full_name}...`, "loading");

    const payload =
      kind === "archive"
        ? { archive_reason: reason, archive_details: details || null }
        : { drop_reason: reason, drop_details: details || null };

    const res = await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    removeToast(loadingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      addToast(`Failed to update: ${err.error ?? "Unknown error"}`, "error");
      return;
    }

    setEditTarget(null);
    addToast(`${app.full_name} updated`, "success");
    await reload();
  };

  /* ── Total count ─────────────────────────────────────── */
  const totalApps = Object.values(columns).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="w-8 h-8 border-2 border-[#4258A5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4 border-b border-slate-100 bg-white">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/applications"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {job?.position_name ?? "Job"}
              </h1>
              {job && !job.is_active && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                  INACTIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              {job?.org_name && <span>{job.org_name}</span>}
              {job?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.location}
                </span>
              )}
              {job?.salary_min && job?.salary_max && (
                <span>
                  {job.currency} {job.salary_min} – {job.salary_max}
                </span>
              )}
              <span className="font-medium text-slate-500">
                {totalApps} applicant{totalApps !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Stats + Dropped button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#4258A5]/20 bg-[#4258A5]/5 text-sm font-semibold text-[#4258A5]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">In Pipeline</span>
              <span>{totalApps}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Onboarded</span>
              <span>{(columns["to_onboard"] ?? []).length}</span>
            </div>
            <button
              onClick={() => setShowDroppedModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition-all"
            >
              <UserX className="w-4 h-4" />
              Dropped
              {droppedApps.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-200 text-orange-700">
                  {droppedApps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowArchivedModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all"
            >
              <Archive className="w-4 h-4" />
              Archive
              {archivedApps.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                  {archivedApps.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ───────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map((stage) => {
              const meta = STAGE_META[stage];
              const items = columns[stage] ?? [];

              return (
                <div
                  key={stage}
                  className="w-72 flex-shrink-0 flex flex-col bg-slate-50/80 rounded-2xl border border-slate-100"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-semibold text-slate-700">
                      {meta.label}
                    </span>
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.bg} ${meta.color}`}
                    >
                      {items.length}
                    </span>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${
                          snapshot.isDraggingOver ? "bg-slate-100/60" : ""
                        }`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                            <Briefcase className="w-5 h-5 mb-1" />
                            <p className="text-xs">No applicants</p>
                          </div>
                        )}

                        {items.map((app, index) => (
                          <Draggable
                            key={app.id}
                            draggableId={String(app.id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => {
                                  if (!snapshot.isDragging) {
                                    router.push(`/admin/applications/${app.id}`);
                                  }
                                }}
                                className={`bg-white rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing transition-shadow select-none ${
                                  snapshot.isDragging
                                    ? "border-[#4258A5]/40 shadow-lg rotate-2"
                                    : "border-slate-100 hover:border-[#4258A5]/30 hover:shadow-md"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {app.face_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={app.face_image_url}
                                      alt=""
                                      className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-slate-200 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 flex-shrink-0 border border-slate-200 shadow-sm">
                                      {getInitials(app.full_name)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <p className="text-sm font-semibold text-slate-900 truncate flex-1">
                                        {app.full_name}
                                      </p>
                                      {app.is_pooled && (
                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {app.email}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                      {app.years_of_experience && (
                                        <span>{app.years_of_experience} yrs exp</span>
                                      )}
                                      {app.expected_salary && (
                                        <span>
                                          {app.expected_salary_currency}{" "}
                                          {app.expected_salary}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-300 mt-1.5">
                                      {new Date(app.created_at).toLocaleDateString("en-SG", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </p>
                                  </div>

                                  {/* 3-dot menu */}
                                  <CardMenu
                                    app={app}
                                    onDrop={(a) => setDropTarget(a)}
                                    onArchive={(a) => setArchiveTarget(a)}
                                    onPool={handlePool}
                                    onUnpool={handleUnpool}
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {dropTarget && (
        <DropModal
          app={dropTarget}
          onClose={() => setDropTarget(null)}
          onConfirm={handleDrop}
        />
      )}

      {archiveTarget && (
        <ArchiveModal
          app={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={handleArchive}
        />
      )}

      {showDroppedModal && (
        <DroppedModal
          apps={droppedApps}
          onClose={() => setShowDroppedModal(false)}
          onRestore={handleRestore}
          onPool={handlePool}
          onUnpool={handleUnpool}
          onArchive={(app) => setArchiveTarget(app)}
          onEdit={(app) => setEditTarget({ app, kind: "drop" })}
        />
      )}

      {showArchivedModal && (
        <ArchivedModal
          apps={archivedApps}
          onClose={() => setShowArchivedModal(false)}
          onUnarchive={handleUnarchive}
          onEdit={(app) => setEditTarget({ app, kind: "archive" })}
        />
      )}

      {editTarget && (
        <EditReasonModal
          app={editTarget.app}
          kind={editTarget.kind}
          initialReason={
            editTarget.kind === "archive"
              ? editTarget.app.archive_reason ?? ""
              : editTarget.app.drop_reason ?? ""
          }
          initialDetails={
            editTarget.kind === "archive"
              ? editTarget.app.archive_details ?? ""
              : editTarget.app.drop_details ?? ""
          }
          onClose={() => setEditTarget(null)}
          onConfirm={handleEditReason}
        />
      )}

      {/* ── Toasts ─────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
