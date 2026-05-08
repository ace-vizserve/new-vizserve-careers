"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Paperclip, X, Loader2, CheckCircle2, AlertCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApproversList } from "./ApproversList";
import type { ApprovalStage } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: z.string().trim().min(1, "Due date is required"),
});

type FormValues = z.infer<typeof schema>;

const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25 MB total — matches typical SharePoint limits

export function ApprovalForm() {
  const idCounter = useRef(1);
  const newStageId = () => `stage-${++idCounter.current}`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", dueDate: "" },
  });

  const [stages, setStages] = useState<ApprovalStage[]>([
    { id: "stage-1", approvers: [] },
  ]);
  const [requireOrder, setRequireOrder] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [approverError, setApproverError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
    noClick: false,
  });

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const addStage = () =>
    setStages((prev) => [...prev, { id: newStageId(), approvers: [] }]);

  // Block Enter from submitting the form (allow newlines in textarea, allow buttons).
  // Submit is mouse-only via the Submit button.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const onSubmit = async (values: FormValues) => {
    setResult(null);
    setApproverError(null);

    const stagesWithApprovers = stages.filter((s) => s.approvers.length > 0);
    if (stagesWithApprovers.length === 0) {
      setApproverError("At least one approver is required.");
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setResult({
        ok: false,
        message: `Attachments exceed ${formatBytes(MAX_TOTAL_SIZE)} total.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          base64: await fileToBase64(file),
        })),
      );

      const flatApprovers = stagesWithApprovers.flatMap((s) =>
        s.approvers.map((a) => a.email),
      );
      const stagesPayload = stagesWithApprovers.map((s) =>
        s.approvers.map((a) => a.email),
      );

      const payload = {
        title: values.title,
        description: values.description,
        approvers: flatApprovers,
        stages: stagesPayload,
        dueDate: values.dueDate,
        requireOrder,
        attachments,
      };

      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Submission failed (${res.status})`);
      }

      setResult({ ok: true, message: "Approval request submitted." });
      reset();
      setStages([{ id: newStageId(), approvers: [] }]);
      setFiles([]);
      setRequireOrder(true);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={handleFormKeyDown}
      className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm"
    >
      <Field label="Title" error={errors.title?.message} required>
        <input
          {...register("title")}
          placeholder="e.g. Q2 marketing budget approval"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#4258A5] focus:ring-2 focus:ring-[#4258A5]/15 transition-all"
        />
      </Field>

      <Field label="Request description" error={errors.description?.message} required>
        <textarea
          {...register("description")}
          rows={4}
          placeholder="Explain what you're asking the approvers to review."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#4258A5] focus:ring-2 focus:ring-[#4258A5]/15 resize-y transition-all"
        />
      </Field>

      <Field label="Due date" error={errors.dueDate?.message} required>
        <input
          type="date"
          {...register("dueDate")}
          className="w-full sm:w-56 h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#4258A5] focus:ring-2 focus:ring-[#4258A5]/15 transition-all"
        />
      </Field>

      <div>
        <div className="flex items-start sm:items-center justify-between mb-3 gap-3 flex-col sm:flex-row">
          <label className="text-sm font-medium text-slate-900">
            Approvers <span className="text-rose-500">*</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <Toggle checked={requireOrder} onChange={setRequireOrder} />
            <span>Require responses in the assigned order</span>
          </label>
        </div>
        <ApproversList
          stages={stages}
          onChange={setStages}
          onAdd={addStage}
          requireOrder={requireOrder}
        />
        {approverError && <p className="text-xs text-rose-500 mt-2">{approverError}</p>}
      </div>

      <Field label="Attachments">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-[#4258A5] bg-[#4258A5]/5"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          }`}
        >
          <input {...getInputProps()} />
          <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">
            {isDragActive ? "Drop files here" : "Drag files here, or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Up to {formatBytes(MAX_TOTAL_SIZE)} total
          </p>
        </div>
        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((file, idx) => (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700">
                  {file.name}{" "}
                  <span className="text-slate-400">({formatBytes(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  aria-label={`Remove ${file.name}`}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {result && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#4258A5] hover:bg-[#3a4d92] text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Briefcase className="w-4 h-4" /> Submit for approval
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-[#4258A5]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
