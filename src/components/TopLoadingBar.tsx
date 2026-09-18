"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Call this right before a manual router.push() (e.g. after a login form succeeds)
 * so the bar starts immediately instead of waiting for the URL to actually change. */
export function startTopLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("top-loading-start"));
  }
}

/**
 * Mounted once in the root layout. Starts on any internal <a>/<Link> click or
 * a manual startTopLoading() call, and completes automatically once the
 * pathname actually changes (the navigation has landed). Deliberately avoids
 * useSearchParams() so it never needs its own Suspense boundary.
 */
export function TopLoadingBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (timerRef.current) return; // already running — don't restart mid-flight
    setVisible(true);
    setWidth(20);
    timerRef.current = setInterval(() => {
      setWidth((w) => (w < 88 ? w + Math.random() * 8 : w));
    }, 250);
  }

  function finish() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setWidth(100);
    setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const isExternal = anchor.target === "_blank" || (href && /^(https?:)?\/\//.test(href));
      if (!href || href.startsWith("#") || isExternal) return;
      start();
    }
    document.addEventListener("click", onClick);
    window.addEventListener("top-loading-start", start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("top-loading-start", start);
    };
  }, []);

  // The pathname changing means the destination page has actually landed.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-brand-blue to-brand-teal transition-[width] duration-300 ease-out shadow-[0_0_8px_rgba(14,168,155,0.6)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
