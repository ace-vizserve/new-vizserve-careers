"use client";

import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  GripVertical,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Application {
  id: number;
  job_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  preferred_name: string;
  birth_date: string;
  gender: string;
  religion: string;
  nationalities: string[];
  residential_status: string;
  passport_no: string;
  nric_fin: string;
  latest_degree: string;
  work_permit_pass: string;
  address: string;
  city: string;
  postal_code: string;
  expected_salary: string;
  expected_salary_currency: string;
  years_of_experience: string;
  industries: string[];
  linkedin: string;
  status: string;
  is_pooled: boolean;
  created_at: string;
  job_portal: string;
  jobs: { position_name: string; org_name: string } | null;
}

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  getSortValue?: (app: Application) => string;
  render: (app: Application) => React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  new_candidates:         "bg-amber-50 text-amber-700 border-amber-200",
  paper_screening:        "bg-blue-50 text-blue-700 border-blue-200",
  for_examination:        "bg-indigo-50 text-indigo-700 border-indigo-200",
  initial_interview:      "bg-cyan-50 text-cyan-700 border-cyan-200",
  rc_bc:                  "bg-teal-50 text-teal-700 border-teal-200",
  second_stage_interview: "bg-sky-50 text-sky-700 border-sky-200",
  final_stage_interview:  "bg-violet-50 text-violet-700 border-violet-200",
  offered:                "bg-orange-50 text-orange-700 border-orange-200",
  to_onboard:             "bg-emerald-50 text-emerald-700 border-emerald-200",
  started:                "bg-green-50 text-green-700 border-green-200",
  regularization:         "bg-purple-50 text-purple-700 border-purple-200",
  dropped:                "bg-rose-50 text-rose-600 border-rose-200",
};

function statusLabel(s: string) {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "full_name",
    label: "Candidate Name",
    sortable: true,
    getSortValue: (a) => a.full_name ?? "",
    render: (a) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
          <User className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{a.full_name}</p>
          {a.preferred_name && <p className="text-xs text-slate-400">"{a.preferred_name}"</p>}
        </div>
      </div>
    ),
  },
  {
    key: "latest_degree",
    label: "Highest Qualification",
    sortable: true,
    getSortValue: (a) => a.latest_degree ?? "",
    render: (a) => <span className="text-slate-700">{a.latest_degree || "—"}</span>,
  },
  {
    key: "phone_number",
    label: "Candidate Phone Number",
    render: (a) => <span className="text-slate-700">{a.phone_number || "—"}</span>,
  },
  {
    key: "email",
    label: "Candidate Email Address",
    sortable: true,
    getSortValue: (a) => a.email ?? "",
    render: (a) => <span className="text-slate-700">{a.email || "—"}</span>,
  },
  {
    key: "residential_status",
    label: "Residential Status",
    sortable: true,
    getSortValue: (a) => a.residential_status ?? "",
    render: (a) => <span className="text-slate-700">{a.residential_status || "—"}</span>,
  },
  {
    key: "created_at",
    label: "Resume Added Date",
    sortable: true,
    getSortValue: (a) => a.created_at ?? "",
    render: (a) => (
      <span className="text-slate-700">
        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
      </span>
    ),
  },
  {
    key: "work_permit_pass",
    label: "Work Permit/Pass",
    sortable: true,
    getSortValue: (a) => a.work_permit_pass ?? "",
    render: (a) => <span className="text-slate-700">{a.work_permit_pass || "—"}</span>,
  },
  {
    key: "religion",
    label: "Religion",
    sortable: true,
    getSortValue: (a) => a.religion ?? "",
    render: (a) => <span className="text-slate-700">{a.religion || "—"}</span>,
  },
  {
    key: "expected_salary",
    label: "Expected Salary",
    sortable: true,
    getSortValue: (a) => a.expected_salary ?? "",
    render: (a) => (
      <span className="text-slate-700">
        {a.expected_salary ? `${a.expected_salary_currency || ""} ${a.expected_salary}` : "—"}
      </span>
    ),
  },
  {
    key: "years_of_experience",
    label: "Years of Experience",
    sortable: true,
    getSortValue: (a) => a.years_of_experience ?? "",
    render: (a) => (
      <span className="text-slate-700">
        {a.years_of_experience ? `${a.years_of_experience} yrs` : "—"}
      </span>
    ),
  },
  {
    key: "gender",
    label: "Gender",
    sortable: true,
    getSortValue: (a) => a.gender ?? "",
    render: (a) => <span className="text-slate-700">{a.gender || "—"}</span>,
  },
  {
    key: "nationalities",
    label: "Nationalities",
    render: (a) => (
      <span className="text-slate-700">
        {a.nationalities?.length
          ? Array.isArray(a.nationalities)
            ? a.nationalities.join(", ")
            : a.nationalities
          : "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    getSortValue: (a) => statusLabel(a.status),
    render: (a) => (
      <span
        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
          STATUS_STYLES[a.status] ?? "bg-slate-50 text-slate-600 border-slate-200"
        }`}
      >
        {statusLabel(a.status)}
      </span>
    ),
  },
  {
    key: "position",
    label: "Applied For",
    sortable: true,
    getSortValue: (a) => a.jobs?.position_name ?? "",
    render: (a) => (
      <div>
        <p className="text-slate-700 font-medium">{a.jobs?.position_name ?? "—"}</p>
        {a.jobs?.org_name && <p className="text-xs text-slate-400">{a.jobs.org_name}</p>}
      </div>
    ),
  },
  {
    key: "industries",
    label: "Industries",
    render: (a) => (
      <span className="text-slate-700">
        {a.industries?.length ? a.industries.join(", ") : "—"}
      </span>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    render: (a) =>
      a.linkedin ? (
        <a href={a.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">
          View
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "birth_date",
    label: "Birth Date",
    sortable: true,
    getSortValue: (a) => a.birth_date ?? "",
    render: (a) => (
      <span className="text-slate-700">
        {a.birth_date ? new Date(a.birth_date).toLocaleDateString() : "—"}
      </span>
    ),
  },
  {
    key: "address",
    label: "Address",
    render: (a) => (
      <span className="text-slate-700">
        {[a.address, a.city, a.postal_code].filter(Boolean).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "is_pooled",
    label: "Pooled",
    sortable: true,
    getSortValue: (a) => (a.is_pooled ? "yes" : "no"),
    render: (a) => (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          a.is_pooled
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-slate-50 text-slate-500 border border-slate-200"
        }`}
      >
        {a.is_pooled ? "Yes" : "No"}
      </span>
    ),
  },
  {
    key: "job_portal",
    label: "Job Portal",
    sortable: true,
    getSortValue: (a) => a.job_portal ?? "",
    render: (a) => <span className="text-slate-700">{a.job_portal || "—"}</span>,
  },
];

const COLUMN_MAP = new Map(ALL_COLUMNS.map((c) => [c.key, c]));

const DEFAULT_VISIBLE_KEYS = [
  "full_name",
  "latest_degree",
  "phone_number",
  "email",
  "residential_status",
  "created_at",
  "work_permit_pass",
  "religion",
  "expected_salary",
  "years_of_experience",
];

const STORAGE_KEY = "vizserve_candidates_columns";

function loadSavedColumns(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((k: unknown) => typeof k === "string")) {
      return parsed.filter((k: string) => COLUMN_MAP.has(k));
    }
  } catch {}
  return null;
}

/* ------------------------------------------------------------------ */
/*  Column Header Cell                                                 */
/* ------------------------------------------------------------------ */

function ColumnHeader({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: ColumnDef;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActiveSorted = sortKey === col.key && sortDir !== null;

  return (
    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
      {col.sortable ? (
        <button
          onClick={() => onSort(col.key)}
          className={`flex items-center gap-1 group hover:text-slate-800 transition-colors ${isActiveSorted ? "text-[#4258A5]" : ""}`}
        >
          <span>{col.label}</span>
          <span className={`transition-colors ${isActiveSorted ? "text-[#4258A5]" : "text-slate-300 group-hover:text-slate-400"}`}>
            {isActiveSorted && sortDir === "asc" ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : isActiveSorted && sortDir === "desc" ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>
      ) : (
        <span>{col.label}</span>
      )}
    </th>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Columns Modal                                                 */
/* ------------------------------------------------------------------ */

function EditColumnsModal({
  visibleKeys,
  onSave,
  onClose,
}: {
  visibleKeys: string[];
  onSave: (keys: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(visibleKeys);
  const [fieldSearch, setFieldSearch] = useState("");

  const toggleColumn = (key: string) =>
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(selected);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSelected(items);
  };

  const removeColumn = (key: string) =>
    setSelected((prev) => prev.filter((k) => k !== key));

  const filteredCols = ALL_COLUMNS.filter((c) =>
    c.label.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit Columns</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-slate-100 flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-slate-700 mb-2">Choose display columns</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="Search fields"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-1.5">
              <button
                onClick={() => {
                  if (selected.length === ALL_COLUMNS.length) setSelected(["full_name"]);
                  else setSelected(ALL_COLUMNS.map((c) => c.key));
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {selected.length === ALL_COLUMNS.length ? "Unselect All" : "Select All"}
              </button>
              <span className="text-xs text-slate-400">{selected.length} of {ALL_COLUMNS.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filteredCols.map((col) => (
                <label key={col.key} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    disabled={col.key === "full_name"}
                    className="w-4 h-4 rounded border-slate-300 text-[#4258A5] focus:ring-[#4258A5]"
                  />
                  <span className="text-sm text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="w-1/2 flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-slate-700">Reorder the columns</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="column-reorder">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {selected.map((key, index) => {
                        const col = COLUMN_MAP.get(key);
                        if (!col) return null;
                        return (
                          <Draggable key={key} draggableId={key} index={index}>
                            {(prov, snapshot) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`flex items-center gap-2 px-3 py-2.5 mb-1 rounded-lg border text-sm transition-colors ${
                                  snapshot.isDragging ? "bg-blue-50 border-blue-200 shadow-md" : "bg-white border-slate-200"
                                }`}
                              >
                                <span {...prov.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab">
                                  <GripVertical className="w-4 h-4" />
                                </span>
                                <span className="flex-1 text-slate-700 font-medium">{col.label}</span>
                                {key !== "full_name" && (
                                  <button onClick={() => removeColumn(key)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(selected)}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: "#4258A5" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCandidatesPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [filters, setFilters] = useState({ status: "", residential: "", pooled: "" });
  const [visibleKeys, setVisibleKeys] = useState<string[]>(
    () => loadSavedColumns() ?? DEFAULT_VISIBLE_KEYS
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    const res = await fetch("/api/applications");
    const data = await res.json();
    setApps(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchCandidates(); }, []);
  useEffect(() => { setPage(1); }, [search, filters, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = apps.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.residential && a.residential_status !== filters.residential) return false;
      if (filters.pooled === "true" && !a.is_pooled) return false;
      if (filters.pooled === "false" && a.is_pooled) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.full_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.phone_number?.toLowerCase().includes(q) ||
          (a.jobs?.position_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortKey && sortDir) {
      const colDef = COLUMN_MAP.get(sortKey);
      result = [...result].sort((a, b) => {
        const aVal = colDef?.getSortValue?.(a) ?? "";
        const bVal = colDef?.getSortValue?.(b) ?? "";
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [apps, filters, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns = useMemo(
    () => visibleKeys.map((k) => COLUMN_MAP.get(k)!).filter(Boolean),
    [visibleKeys]
  );

  const handleSaveColumns = (keys: string[]) => {
    setVisibleKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    setShowColumnEditor(false);
  };

  return (
    <div className="p-8 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4258A5]" />
            <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            All applicants across all positions ({apps.length} total)
          </p>
        </div>
      </div>

      {/* Search + Filters + Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, position..."
            className="w-72 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5] transition-all"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5]"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select
          value={filters.residential}
          onChange={(e) => setFilters((f) => ({ ...f, residential: e.target.value }))}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5]"
        >
          <option value="">All Residential Status</option>
          <option value="Filipino Citizen">Filipino Citizen</option>
          <option value="Permanent Resident">Permanent Resident</option>
          <option value="OFW">OFW</option>
          <option value="Work Visa Holder">Work Visa Holder</option>
          <option value="Foreigner">Foreigner</option>
        </select>
        <select
          value={filters.pooled}
          onChange={(e) => setFilters((f) => ({ ...f, pooled: e.target.value }))}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5]"
        >
          <option value="">All Candidates</option>
          <option value="true">Pooled Only</option>
          <option value="false">Not Pooled</option>
        </select>
        {(filters.status || filters.residential || filters.pooled) && (
          <button
            onClick={() => setFilters({ status: "", residential: "", pooled: "" })}
            className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Clear All
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={fetchCandidates}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowColumnEditor(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 transition-all"
          >
            <Columns3 className="w-4 h-4" />
            Columns
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#4258A5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
              <Users className="w-6 h-6 text-blue-300" />
            </div>
            <p className="text-slate-600 font-semibold">No candidates found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filters.status || filters.residential || filters.pooled
                ? "Try adjusting your search or filters"
                : "No applications have been submitted yet"}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-slate-50">
                  {columns.map((col) => (
                    <ColumnHeader
                      key={col.key}
                      col={col}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  ))}
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((app) => (
                  <tr key={app.id} className="group/row hover:bg-slate-50/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4 whitespace-nowrap max-w-[240px] truncate">
                        {col.render(app)}
                      </td>
                    ))}
                    <td className="px-6 py-4 sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover/row:bg-slate-50">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          title="View application"
                          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] transition-all"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between pt-3 pb-1 px-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Results per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4258A5]/30 focus:border-[#4258A5]"
            >
              {[10, 25, 50, 100, 250].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-[#4258A5] hover:text-[#4258A5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Editor Modal */}
      {showColumnEditor && (
        <EditColumnsModal
          visibleKeys={visibleKeys}
          onSave={handleSaveColumns}
          onClose={() => setShowColumnEditor(false)}
        />
      )}
    </div>
  );
}