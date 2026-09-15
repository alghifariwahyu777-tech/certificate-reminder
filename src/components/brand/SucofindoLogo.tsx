import Image from "next/image";

/** Full logo with wordmark — use on light backgrounds only (dark text won't read on dark bg). */
export function SucofindoLogo({ className, height = 32 }: { className?: string; height?: number }) {
  const width = Math.round(height * (3840 / 2647));
  return (
    <Image
      src="/brand/logo-sucofindo.png"
      alt="PT Sucofindo (Persero)"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

/** Checkmark-only mark — safe on dark backgrounds (sidebar, dark hero panels). */
export function SucofindoMark({ className, size = 28 }: { className?: string; size?: number }) {
  const width = Math.round(size * (768 / 727));
  return (
    <Image
      src="/brand/logo-sucofindo-icon.png"
      alt="PT Sucofindo (Persero)"
      width={width}
      height={size}
      className={className}
      priority
    />
  );
}
