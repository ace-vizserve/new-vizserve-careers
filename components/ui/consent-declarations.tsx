export const ConsentDeclarations = ({
  declareTruth,
  setDeclareTruth,
  declareConsent,
  setDeclareConsent,
}: {
  declareTruth: boolean;
  setDeclareTruth: (v: boolean) => void;
  declareConsent: boolean;
  setDeclareConsent: (v: boolean) => void;
}) => {
  const CheckItem = ({
    checked,
    onChange,
    children,
    id,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    children: React.ReactNode;
    id: string;
  }) => (
    <label
      htmlFor={id}
      className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all select-none ${
        checked ? "border-blue-400 bg-blue-50/50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}>
      <div className="flex-shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            checked ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
          }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              />
            </svg>
          )}
        </div>
      </div>
      <span className={`text-sm leading-relaxed ${checked ? "text-slate-800" : "text-slate-600"}`}>{children}</span>
    </label>
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
      <div className="flex items-start gap-4 mb-7">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 leading-tight">Consent &amp; Acknowledgement</h3>
          <p className="text-xs text-slate-400 mt-0.5">Please read and confirm both statements before submitting</p>
        </div>
      </div>

      <div className="space-y-3">
        <CheckItem id="declare-truth" checked={declareTruth} onChange={setDeclareTruth}>
          I hereby declare that all the particulars given herein are true and correct, and I have not willfully
          suppressed any material fact.
        </CheckItem>

        <CheckItem id="declare-consent" checked={declareConsent} onChange={setDeclareConsent}>
          I hereby give consent to collection, use and disclosure of my personal data by the company for the purpose of
          the processing and administration by the company relating to this attached job application.
        </CheckItem>
      </div>

      {(!declareTruth || !declareConsent) && (
        <p className="mt-4 text-xs text-rose-500 font-medium flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Both statements must be acknowledged before you can submit.
        </p>
      )}
    </div>
  );
};
