"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * A search "field" that's actually a button — clicking it opens a popup
 * modal with a full-width text input, so the typed term is never cramped
 * inside a narrow inline box (the original problem this replaces).
 */
export function SearchPopoverButton({
  value,
  onChange,
  placeholder,
  label = "Cari",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function openModal() {
    setDraft(value);
    setOpen(true);
  }

  function apply() {
    onChange(draft.trim());
    setOpen(false);
  }

  function clear() {
    onChange("");
    setDraft("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm w-full h-[38px] transition-colors ${
          value
            ? "border-accent/40 bg-accent/5 text-ink dark:text-slate-100"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-300"
        } ${className}`}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1 text-left">{value || label}</span>
        {value && (
          <span
            role="button"
            aria-label="Hapus pencarian"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="shrink-0 text-slate-400 hover:text-signal-expired"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={label}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="space-y-4"
        >
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
          <div className="flex justify-end gap-2">
            {value && (
              <Button type="button" variant="outline" onClick={clear}>
                Hapus Pencarian
              </Button>
            )}
            <Button type="submit">Terapkan</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
