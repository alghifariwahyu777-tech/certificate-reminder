import * as React from "react";
import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const showDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1]} ${m[1]}` : "";
};

/**
 * Date field that always reads in Indonesian ("6 Nov 2026") whatever the
 * browser language, instead of the browser's own mm/dd/yyyy. The real date
 * input stays underneath (so the calendar picker, keyboard entry and form
 * libraries work as before); only its text is drawn by us.
 */
const DateField = forwardRef<HTMLInputElement, InputProps>(({ className, error, onClick, ...props }, ref) => {
  const inner = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState(() => showDate(String(props.value ?? props.defaultValue ?? "")));
  const sync = React.useCallback(() => setText(showDate(inner.current?.value ?? "")), []);
  React.useEffect(() => {
    sync();
    // forms may set the value without an event (reset, setValue): check now and then while mounted
    const id = window.setInterval(sync, 400);
    return () => window.clearInterval(id);
  }, [sync]);
  React.useEffect(sync, [props.value, sync]);
  const setRefs = (el: HTMLInputElement | null) => {
    inner.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={setRefs}
          type="date"
          lang="id"
          className={cn(
            "date-field w-full rounded-md border bg-white px-3 py-2 text-sm text-transparent transition-colors dark:bg-slate-900",
            error ? "border-signal-expiredBorder focus:border-signal-expired" : "border-slate-300 focus:border-accent dark:border-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-accent/20",
            className
          )}
          {...props}
          onInput={(e) => {
            sync();
            props.onInput?.(e);
          }}
          onClick={(e) => {
            try {
              (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            } catch {}
            onClick?.(e);
          }}
        />
        <span className={cn("pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm", text ? "text-ink dark:text-slate-100" : "text-slate-400", props.disabled && "opacity-60")}>
          {text || "Pilih tanggal"}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-signal-expired">{error}</p>}
    </div>
  );
});
DateField.displayName = "DateField";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    if (props.type === "date") return <DateField ref={ref} className={className} error={error} {...props} />;
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "w-full rounded-md border px-3 py-2 text-sm text-ink bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
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
            "w-full rounded-md border px-3 py-2 text-sm text-ink bg-white transition-colors placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
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
            "w-full rounded-md border px-3 py-2 text-sm text-ink bg-white transition-colors dark:bg-slate-900 dark:text-slate-100",
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
      className={cn("block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5", className)}
      {...props}
    />
  );
}
