import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificate Reminder | PT Sucofindo (Persero)",
  description:
    "Ensuring Quality, Protecting Trust — sistem internal untuk mengelola dan memantau masa berlaku sertifikat klien PT Sucofindo (Persero).",
  icons: { icon: "/brand/logo-sucofindo-icon.png" },
};

// Runs before React hydrates so the correct theme class is already on
// <html> at first paint — without this, the page would flash light mode
// for a moment even when the user has dark mode saved.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === "dark" || (!theme && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
