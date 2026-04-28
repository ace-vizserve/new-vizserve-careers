import { LucideIcon } from "lucide-react";

export function PhasePlaceholder({
  title,
  description,
  phase,
  Icon,
}: {
  title: string;
  description: string;
  phase: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-500 mb-4">{description}</p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {phase}
        </span>
      </div>
    </div>
  );
}
