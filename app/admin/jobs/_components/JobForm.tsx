"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface JobFormData {
  position_name:   string;
  description:     string;
  location:        string;
  city:            string;
  state:           string;
  country:         string;
  employment_type: string;
  is_remote:       boolean;
  headcount:       number;
  salary_min:      string;
  salary_max:      string;
  currency:        string;
  frequency:       string;
  urgently_hiring: boolean;
  is_active:       boolean;
}

interface JobFormProps {
  initial?: Partial<JobFormData>;
  jobId?:   number;
}

const EMPTY: JobFormData = {
  position_name:   "",
  description:     "",
  location:        "",
  city:            "",
  state:           "",
  country:         "",
  employment_type: "Full-Time",
  is_remote:       false,
  headcount:       1,
  salary_min:      "",
  salary_max:      "",
  currency:        "PHP",
  frequency:       "Monthly",
  urgently_hiring: false,
  is_active:       true,
};

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all";

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
    {children}{required && <span className="text-rose-400 ml-1">*</span>}
  </label>
);

export default function JobForm({ initial, jobId }: JobFormProps) {
  const router = useRouter();
  const isEdit = Boolean(jobId);
  const [form, setForm]     = useState<JobFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (key: keyof JobFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      contract_details: form.employment_type,
      easily_apply: false,
      requirements: [],
      benefits: [],
      org_name: "VizServe",
      org_logo: "/assets/VizServeWhite.png",
      org_website: "https://vizserve.com",
    };

    const url    = isEdit ? `/api/admin/jobs/${jobId}` : "/api/admin/jobs";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save job");
      setSaving(false);
      return;
    }

    router.push("/admin/jobs");
  };

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Job" : "Create Job"}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              A job represents a new opening, an open position or a vacancy listing.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">

          {/* Position Name */}
          <div>
            <Label required>Position Name</Label>
            <input
              value={form.position_name}
              onChange={e => set("position_name", e.target.value)}
              className={inputCls}
              placeholder="e.g. Virtual Assistant"
              required
            />
          </div>

          {/* Location + Remote */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Location</Label>
              <input
                value={form.location}
                onChange={e => set("location", e.target.value)}
                className={inputCls}
                placeholder="Add location"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_remote}
                  onChange={e => set("is_remote", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#4258A5] focus:ring-[#4258A5]/30"
                />
                <span className="text-sm text-slate-700 font-medium">Remote</span>
              </label>
            </div>
          </div>

          {/* Country / City / State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Country</Label>
              <input value={form.country} onChange={e => set("country", e.target.value)} className={inputCls} placeholder="e.g. Philippines" />
            </div>
            <div>
              <Label>City</Label>
              <input value={form.city} onChange={e => set("city", e.target.value)} className={inputCls} placeholder="e.g. Taguig" />
            </div>
            <div>
              <Label>State / Province</Label>
              <input value={form.state} onChange={e => set("state", e.target.value)} className={inputCls} placeholder="e.g. Metro Manila" />
            </div>
          </div>

          {/* Headcount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Headcount</Label>
              <input
                type="number"
                min={1}
                value={form.headcount}
                onChange={e => set("headcount", Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Contract Details (Employment Type) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Contract Details</Label>
              <select value={form.employment_type} onChange={e => set("employment_type", e.target.value)} className={inputCls}>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Minimum Salary</Label>
              <input
                type="number"
                value={form.salary_min}
                onChange={e => set("salary_min", e.target.value)}
                className={inputCls}
                placeholder="Add minimum salary"
              />
            </div>
            <div>
              <Label>Maximum Salary</Label>
              <input
                type="number"
                value={form.salary_max}
                onChange={e => set("salary_max", e.target.value)}
                className={inputCls}
                placeholder="Add maximum salary"
              />
            </div>
          </div>

          {/* Currency + Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Currency</Label>
              <select value={form.currency} onChange={e => set("currency", e.target.value)} className={inputCls}>
                <option value="PHP">Philippine Peso</option>
                <option value="USD">US Dollar</option>
                <option value="SGD">Singapore Dollar</option>
                <option value="EUR">Euro</option>
                <option value="GBP">British Pound</option>
              </select>
            </div>
            <div>
              <Label>Select Frequency</Label>
              <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className={inputCls}>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <Label required>Job Description</Label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              className={`${inputCls} resize-none`}
              rows={12}
              placeholder="Add a job description..."
              required
            />
          </div>

          {/* Publish + Urgently Hiring checkboxes */}
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => set("is_active", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#4258A5] focus:ring-[#4258A5]/30"
              />
              <span className="text-sm text-slate-700 font-medium">Publish to career page</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.urgently_hiring}
                onChange={e => set("urgently_hiring", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#4258A5] focus:ring-[#4258A5]/30"
              />
              <span className="text-sm text-slate-700 font-medium">Urgently Hiring</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-7 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
            style={{ backgroundColor: '#4258A5' }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
