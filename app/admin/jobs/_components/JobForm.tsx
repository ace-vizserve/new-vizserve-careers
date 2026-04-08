"use client";

import { ArrowLeft, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface JobFormData {
  position_name:    string;
  description:      string;
  location:         string;
  city:             string;
  state:            string;
  country:          string;
  employment_type:  string;
  contract_details: string;
  is_remote:        boolean;
  salary_min:       string;
  salary_max:       string;
  currency:         string;
  frequency:        string;
  requirements:     string[];
  benefits:         string[];
  urgently_hiring:  boolean;
  easily_apply:     boolean;
  org_name:         string;
  org_logo:         string;
  org_website:      string;
  is_active:        boolean;
}

interface JobFormProps {
  initial?: Partial<JobFormData>;
  jobId?:   number;
}

const EMPTY: JobFormData = {
  position_name:    "",
  description:      "",
  location:         "",
  city:             "",
  state:            "",
  country:          "",
  employment_type:  "Full-Time",
  contract_details: "",
  is_remote:        false,
  salary_min:       "",
  salary_max:       "",
  currency:         "SGD",
  frequency:        "month",
  requirements:     [],
  benefits:         [],
  urgently_hiring:  false,
  easily_apply:     true,
  org_name:         "VizServe",
  org_logo:         "/assets/VizServeWhite.png",
  org_website:      "https://vizserve.com",
  is_active:        true,
};

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all";

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
    {children}{required && <span className="text-rose-400 ml-1">*</span>}
  </label>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? "" : "bg-slate-200"}`}
      style={checked ? { backgroundColor: '#4258A5' } : {}}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
    <span className="text-sm text-slate-700 font-medium">{label}</span>
  </label>
);

export default function JobForm({ initial, jobId }: JobFormProps) {
  const router  = useRouter();
  const isEdit  = Boolean(jobId);
  const [form,  setForm]    = useState<JobFormData>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // Dynamic list helpers
  const [reqInput, setReqInput] = useState("");
  const [benInput, setBenInput] = useState("");

  const set = (key: keyof JobFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addToList = (key: "requirements" | "benefits", value: string) => {
    if (!value.trim()) return;
    set(key, [...form[key], value.trim()]);
  };

  const removeFromList = (key: "requirements" | "benefits", idx: number) =>
    set(key, form[key].filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
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

  const Section = ({ title }: { title: string }) => (
    <div className="col-span-2 pt-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">{title}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Job" : "New Job Posting"}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Fill in the details below</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          <Section title="Position Details" />

          <div className="md:col-span-2">
            <Label required>Job Title / Position Name</Label>
            <input value={form.position_name} onChange={e => set("position_name", e.target.value)} className={inputCls} placeholder="e.g. Virtual Assistant" required />
          </div>

          <div className="md:col-span-2">
            <Label required>Job Description</Label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              className={`${inputCls} resize-none`}
              rows={10}
              placeholder="Describe the role, responsibilities, and what you're looking for…"
              required
            />
          </div>

          <Section title="Employment" />

          <div>
            <Label required>Employment Type</Label>
            <select value={form.employment_type} onChange={e => set("employment_type", e.target.value)} className={inputCls}>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Freelance">Freelance</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <Label>Contract Details</Label>
            <input value={form.contract_details} onChange={e => set("contract_details", e.target.value)} className={inputCls} placeholder="e.g. full_time, part_time" />
          </div>

          <Section title="Location" />

          <div>
            <Label>Location (display)</Label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className={inputCls} placeholder="e.g. Singapore" />
          </div>
          <div>
            <Label>Country</Label>
            <input value={form.country} onChange={e => set("country", e.target.value)} className={inputCls} placeholder="e.g. Singapore" />
          </div>
          <div>
            <Label>City</Label>
            <input value={form.city} onChange={e => set("city", e.target.value)} className={inputCls} placeholder="e.g. Taguig" />
          </div>
          <div>
            <Label>State / Province</Label>
            <input value={form.state} onChange={e => set("state", e.target.value)} className={inputCls} placeholder="e.g. Metro Manila" />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-6">
            <Toggle label="Remote Position"  checked={form.is_remote}       onChange={v => set("is_remote", v)} />
            <Toggle label="Urgently Hiring"  checked={form.urgently_hiring}  onChange={v => set("urgently_hiring", v)} />
            <Toggle label="Easy Apply"       checked={form.easily_apply}     onChange={v => set("easily_apply", v)} />
            <Toggle label="Published (Active)" checked={form.is_active}      onChange={v => set("is_active", v)} />
          </div>

          <Section title="Compensation (optional)" />

          <div>
            <Label>Min Salary</Label>
            <input type="number" value={form.salary_min} onChange={e => set("salary_min", e.target.value)} className={inputCls} placeholder="e.g. 3000" />
          </div>
          <div>
            <Label>Max Salary</Label>
            <input type="number" value={form.salary_max} onChange={e => set("salary_max", e.target.value)} className={inputCls} placeholder="e.g. 5000" />
          </div>
          <div>
            <Label>Currency</Label>
            <select value={form.currency} onChange={e => set("currency", e.target.value)} className={inputCls}>
              {["SGD","USD","PHP","EUR","GBP"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Pay Frequency</Label>
            <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className={inputCls}>
              {["month","year","week","day","hour"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <Section title="Requirements" />
          <div className="md:col-span-2 space-y-2">
            {form.requirements.map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">
                <span className="flex-1">{r}</span>
                <button type="button" onClick={() => removeFromList("requirements", i)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={reqInput}
                onChange={e => setReqInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToList("requirements", reqInput); setReqInput(""); } }}
                className={inputCls}
                placeholder="Add a requirement and press Enter"
              />
              <button type="button" onClick={() => { addToList("requirements", reqInput); setReqInput(""); }}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Section title="Benefits" />
          <div className="md:col-span-2 space-y-2">
            {form.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">
                <span className="flex-1">{b}</span>
                <button type="button" onClick={() => removeFromList("benefits", i)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={benInput}
                onChange={e => setBenInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToList("benefits", benInput); setBenInput(""); } }}
                className={inputCls}
                placeholder="Add a benefit and press Enter"
              />
              <button type="button" onClick={() => { addToList("benefits", benInput); setBenInput(""); }}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Section title="Organization" />

          <div>
            <Label>Org Name</Label>
            <input value={form.org_name} onChange={e => set("org_name", e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label>Org Website</Label>
            <input value={form.org_website} onChange={e => set("org_website", e.target.value)} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <Label>Logo URL</Label>
            <input value={form.org_logo} onChange={e => set("org_logo", e.target.value)} className={inputCls} placeholder="/assets/VizServeWhite.png" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-7 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
            style={{ backgroundColor: '#4258A5' }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Publish Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
