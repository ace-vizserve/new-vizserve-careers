"use client";

import {
  Briefcase,
  ChevronLeft,
  Facebook,
  Filter,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

interface NavbarProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: FilterOptions) => void;
}

interface FilterOptions {
  location: string;
  employmentType: string;
  isRemote: boolean | null;
}

const Navbar: React.FC<NavbarProps> = ({ showBackButton = false, onBack, onSearch, onFilterChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    location: "",
    employmentType: "",
    isRemote: null,
  });

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const clearFilters = () => {
    const cleared: FilterOptions = { location: "", employmentType: "", isRemote: null };
    setFilters(cleared);
    onFilterChange?.(cleared);
  };

  const activeFilterCount = [filters.location, filters.employmentType, filters.isRemote !== null].filter(
    Boolean,
  ).length;

  // ── Shared input class (Bigger text & padding) ──────────────────────────
  const inputCls =
    "w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-base placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all duration-200 hover:border-slate-300 shadow-sm";

  // ── Radio pill (Bigger text & padding) ──────────────────────────────────
  const RadioPill = ({
    label,
    checked,
    onChange,
    name,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
    name: string;
  }) => (
    <label
      className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all select-none
        ${
          checked
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {label}
    </label>
  );

  const FilterPanel = ({ namePrefix }: { namePrefix: string }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter Positions</p>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 underline underline-offset-4">
            Clear all
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
          <MapPin className="w-4 h-4" />
          Location
        </label>
        <input
          type="text"
          placeholder="e.g. Manila, Singapore…"
          value={filters.location}
          onChange={(e) => handleFilterUpdate("location", e.target.value)}
          className={inputCls + "text-sm"}
        />
      </div>

      {/* Employment Type */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
          <Briefcase className="w-4 h-4" />
          Employment Type
        </label>
        <select
          value={filters.employmentType}
          onChange={(e) => handleFilterUpdate("employmentType", e.target.value)}
          className={
            inputCls +
            " appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_18px_center] text-sm"
          }>
          <option value="">All Types</option>
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Freelance">Freelance</option>
          <option value="Internship">Internship</option>
        </select>
      </div>

      {/* Work Setting */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Work Setting</p>
        <div className="flex flex-wrap gap-3">
          <RadioPill
            name={`${namePrefix}-remote`}
            label="All"
            checked={filters.isRemote === null}
            onChange={() => handleFilterUpdate("isRemote", null)}
          />
          <RadioPill
            name={`${namePrefix}-remote`}
            label="Remote"
            checked={filters.isRemote === true}
            onChange={() => handleFilterUpdate("isRemote", true)}
          />
          <RadioPill
            name={`${namePrefix}-remote`}
            label="On-site"
            checked={filters.isRemote === false}
            onChange={() => handleFilterUpdate("isRemote", false)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        nav, nav * { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="text-white sticky top-0 left-0 right-0 z-50 py-4" style={{ backgroundColor: '#4258A5' }}>
        {/* ── Top info bar (Bigger text & Height) ────────────────────────── */}
        <div className="w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-12">
            <div className="flex items-center gap-6 text-[13px] font-semibold tracking-wide">
              <a
                href="mailto:recruitment@viszerve.com"
                className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">recruitment@viszerve.com</span>
              </a>
           
              <a
                href="https://vizserve.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors border-l border-white/20 pl-6 ml-1">
                <Globe className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">Visit Website</span>
              </a>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {[
                { Icon: Facebook, href: "https://www.facebook.com/vizserve" },
                { Icon: Linkedin, href: "https://www.linkedin.com/company/vizserve" },
              ].map(({ Icon, href }, idx) => (
                <a
                  key={idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/25 rounded-lg transition-all hover:-translate-y-0.5 active:scale-90"
                  aria-label={`Visit our ${Icon.name}`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main nav bar (Increased Height to h-24) ────────────────────── */}
        <nav>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-24 w-full gap-8">
              {/* Left: back button + logo */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {showBackButton && onBack && (
                  <button
                    onClick={onBack}
                    className="md:hidden p-3 rounded-xl hover:bg-slate-100 transition-colors text-slate-600">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                <a href="/" className="transition-transform hover:scale-105 active:scale-95">
                  <Image
                    src="/assets/VizServeWhite.png"
                    alt="Logo"
                    width={220}
                    height={110}
                    className="h-20 w-auto object-contain ml-4"
                    priority
                  />
                </a>
              </div>

              <div className="flex-1" />

              {/* Desktop: search + filter ─────────────────────────────── */}
              <div className="hidden md:flex items-center gap-4">
                {/* Search input (Bigger Text & Width) */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search positions…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-12 pr-6 py-3.5 w-80 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 focus:bg-white transition-all duration-200 hover:border-slate-300 shadow-sm"
                  />
                </div>

                {/* Filter button (Bigger Text & Padding) */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 text-sm font-bold transition-all duration-200
                      ${
                        showFilters || activeFilterCount > 0
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900"
                      }`}>
                    <Filter className="w-5 h-5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-black shadow-lg border-2 border-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Desktop filter dropdown */}
                  {showFilters && (
                    <div className="absolute right-0 top-[calc(100%+14px)] w-96 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200/80 p-7 z-50">
                      <div className="absolute -top-2 right-8 w-5 h-5 bg-white border-l border-t border-slate-200 rotate-45" />
                      <FilterPanel namePrefix="desktop" />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile menu toggle */}
              <div className="md:hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileOpen(!mobileOpen);
                  }}
                  className="p-3 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200"
                  aria-label="Toggle menu">
                  {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile expanded panel */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              mobileOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
            }`}>
            <div className="px-5 pb-8 pt-4 bg-slate-50 border-t border-slate-100 space-y-6 shadow-inner">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search positions…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-base text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all duration-200"
                />
              </div>

              <div className="border-t border-slate-200" />
              <FilterPanel namePrefix="mobile" />
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navbar;