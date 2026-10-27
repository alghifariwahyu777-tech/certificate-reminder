"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  /** "top" pins the dialog near the top of the screen — used by search so the typed term stays visible above an on-screen keyboard. */
  position?: "center" | "top";
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md", position = "center" }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-ink/40 backdrop-blur-[2px] p-4 ${
        position === "top" ? "items-start pt-[12vh] sm:pt-[15vh]" : "items-center"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidth} rounded-lg bg-white shadow-panel border border-line dark:bg-slate-900 dark:border-slate-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-[15px] text-ink dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="text-slate-400 hover:text-ink dark:hover:text-slate-100 rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[calc(100vh-9rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
