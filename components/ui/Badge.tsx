import type { HTMLAttributes } from "react";

import { cn } from "@/lib/classnames";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "low" | "medium" | "high" | "critical";
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-slate-700 text-slate-100",
  low: "bg-emerald-700 text-emerald-100",
  medium: "bg-amber-700 text-amber-100",
  high: "bg-orange-700 text-orange-100",
  critical: "bg-rose-700 text-rose-100",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
