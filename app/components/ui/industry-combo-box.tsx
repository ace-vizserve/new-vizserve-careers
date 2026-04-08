"use client";

import { industry_list } from "@/app/constants";
import { useEffect, useRef, useState } from "react";

interface IndustryComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  required?: boolean;
}

export const IndustryCombobox = ({ value = [], onChange, id }: IndustryComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = industry_list.filter((ind) => value.includes(String(ind.id)));
  const filtered = industry_list.filter((ind) => ind.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const inputBase =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all duration-200 " +
    "hover:border-slate-300 text-sm";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className={`${inputBase} flex items-center justify-between gap-2 text-left min-h-[48px] h-auto`}>
        <div className="flex-1 flex flex-wrap gap-1.5 py-0.5">
          {selected.length > 0 ? (
            selected.map((ind) => (
              <span
                key={ind.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                {ind.name}
                <span
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    remove(String(ind.id));
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") remove(String(ind.id)); }}
                  className="hover:text-rose-500 transition-colors ml-0.5 cursor-pointer">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </span>
            ))
          ) : (
            <span className="text-slate-400">Select industries…</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start mt-1">
          {selected.length > 0 && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
              {selected.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search industries…"
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((ind) => {
                const isActive = value.includes(String(ind.id));
                return (
                  <li key={ind.id}>
                    <button
                      type="button"
                      onMouseDown={() => toggle(String(ind.id))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                      }`}>
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          isActive ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                        }`}>
                        {isActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <span className={isActive ? "font-medium" : ""}>{ind.name}</span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">No industries match</li>
            )}
          </ul>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 pl-1">
              {selected.length > 0 ? `${selected.length} selected` : "Select all that apply"}
            </span>
            {value.length > 0 && (
              <button
                type="button"
                onMouseDown={() => {
                  onChange([]);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center gap-1 py-1 px-2.5 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
