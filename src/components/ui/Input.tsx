import * as React from "react";
import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "w-full rounded border px-3 py-2 text-sm text-ink bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            error
              ? "border-signal-expiredBorder focus:border-signal-expired"
              : "border-slate-300 focus:border-accent dark:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-accent/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-signal-expired">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded border px-3 py-2 text-sm text-ink bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            error
              ? "border-signal-expiredBorder focus:border-signal-expired"
              : "border-slate-300 focus:border-accent dark:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-accent/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-signal-expired">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "w-full rounded border px-3 py-2 text-sm text-ink bg-white transition-colors dark:bg-slate-900 dark:text-slate-100",
            error
              ? "border-signal-expiredBorder focus:border-signal-expired"
              : "border-slate-300 focus:border-accent dark:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-accent/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-signal-expired">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide", className)}
      {...props}
    />
  );
}
