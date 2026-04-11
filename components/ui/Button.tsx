import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/classnames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500",
  secondary:
    "bg-slate-200 text-slate-900 hover:bg-slate-300 focus-visible:ring-slate-500",
  ghost:
    "bg-transparent text-slate-200 hover:bg-slate-800 focus-visible:ring-slate-500",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
