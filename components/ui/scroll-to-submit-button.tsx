"use client";

import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

type ScrollToSubmitButtonProps = {
  targetId?: string;
  threshold?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function ScrollToSubmitButton({
  targetId = "submit-application-action",
  threshold = 800,
  disabled = false,
  className,
  label = "Go to submit",
}: ScrollToSubmitButtonProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const target = document.getElementById(targetId);
      const passedThreshold = window.scrollY > threshold;

      if (!target) {
        setVisible(passedThreshold);
        return;
      }

      const rect = target.getBoundingClientRect();
      const targetInView = rect.top < window.innerHeight && rect.bottom > 0;

      setVisible(passedThreshold && !targetInView);
    };

    handleScroll();
    setMounted(true);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [targetId, threshold]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-hidden={!visible}
      onClick={() => {
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className={cn(
        "cursor-pointer animate-bounce fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl",
        "focus:outline-none focus:ring-2 focus:ring-blue-400/60",
        "disabled:pointer-events-none disabled:opacity-50",
        mounted && visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0",
        className,
      )}>
      <ArrowDown className="size-4 motion-safe:animate-bounce" />
      <span>{label}</span>
    </button>
  );
}
