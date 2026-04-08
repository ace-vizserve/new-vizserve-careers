"use client";

export type ErrorSummaryItem = {
  path: string;
  message: string;
};

type ErrorSummaryProps = {
  errors: ErrorSummaryItem[];
  onItemClick: (path: string) => void;
  title?: string;
};

export function ErrorSummary({ errors, onItemClick, title = "Please fix the following errors:" }: ErrorSummaryProps) {
  if (!errors.length) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>

      <ul className="list-disc grid md:grid-cols-2 pl-5 space-y-1 text-sm">
        {errors.map((item) => (
          <li key={item.path}>
            <button
              type="button"
              onClick={() => onItemClick(item.path)}
              className="cursor-pointer text-left underline underline-offset-2 hover:text-rose-800">
              {item.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
