"use client";

import { nationalities } from "@/app/constants";
import { useEffect, useRef, useState } from "react";

interface NationalityOption {
  id: number;
  common_name: string;
  demonym: string;
}

interface NationalityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export const NationalityCombobox = ({
  value,
  onChange,
  onBlur,
  required,
  placeholder = "Search nationality…",
  id,
}: NationalityComboboxProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = nationalities.find((n) => n.demonym === value);
  const displayValue = selectedOption ? `${selectedOption.demonym} (${selectedOption.common_name})` : value;

  const filtered: NationalityOption[] =
    query.trim() === ""
      ? nationalities
      : nationalities.filter((n) => {
          const q = query.toLowerCase();
          return n.demonym.toLowerCase().includes(q) || n.common_name.toLowerCase().includes(q);
        });

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlur]);

  const handleSelect = (option: NationalityOption) => {
    onChange(option.demonym);
    setQuery("");
    setOpen(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlighted]) handleSelect(filtered[highlighted]);
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  };

  const inputBase =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all duration-200 " +
    "hover:border-slate-300 text-sm";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          autoComplete="off"
          placeholder={open ? "Type to search…" : placeholder}
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`${inputBase} pr-10`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
      </div>

      {open && (
        <div className="absolute z-30 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search hint */}
          {query === "" && (
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <span className="text-xs text-slate-400">Type to filter {nationalities.length} nationalities</span>
            </div>
          )}

          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((option, i) => {
                const isSelected = option.demonym === value;
                const isHighlighted = i === highlighted;

                return (
                  <li
                    key={option.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                      isHighlighted ? "bg-blue-50" : ""
                    } ${isSelected ? "text-blue-700 font-semibold" : "text-slate-700"}`}>
                    <span>
                      {query.trim() !== ""
                        ? (() => {
                            const q = query.toLowerCase();
                            const label = `${option.demonym} (${option.common_name})`;
                            const idx = label.toLowerCase().indexOf(q);
                            if (idx === -1) return label;
                            return (
                              <>
                                {label.slice(0, idx)}
                                <mark className="bg-blue-100 text-blue-700 rounded-sm px-0.5 not-italic font-semibold">
                                  {label.slice(idx, idx + q.length)}
                                </mark>
                                {label.slice(idx + q.length)}
                              </>
                            );
                          })()
                        : `${option.demonym} (${option.common_name})`}
                    </span>

                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-2"
                        fill="currentColor"
                        viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center">
                <p className="text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-slate-300 mt-0.5">Try a different spelling or country name</p>
              </li>
            )}
          </ul>

          {query.trim() !== "" && filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
