export const ApplicationNote = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Note</p>
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          Kindly review the application form and ensure that all required information has been provided, especially the
          fields marked with <span className="font-bold text-rose-600">red asterisks</span> or{" "}
          <span className="font-bold text-rose-600">red borders</span>, which need to be filled out. If you encounter a
          problem submitting the application, kindly copy the link and paste it into a different browser and provide us
          with a screenshot if the issue occurs again.
        </p>
        <p className="text-sm text-slate-700">
          For assistance, please contact{" "}
          <a
            href="mailto:kurtsteven.arciga@vizseve.com"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
            kurtsteven.arciga@vizseve.com
          </a>
        </p>
      </div>
    </div>
  </div>
);
