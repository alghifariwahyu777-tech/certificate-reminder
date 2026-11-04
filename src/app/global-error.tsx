"use client";

/** Last resort when even the root layout fails: plain markup, no app styles needed. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F4F6F9", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, textAlign: "center" }}>
            <h1 style={{ fontSize: 17, margin: "0 0 6px", color: "#0F172A" }}>Halaman belum bisa dimuat</h1>
            <p style={{ fontSize: 13.5, color: "#475569", margin: "0 0 18px" }}>Koneksi terputus sebentar. Data Anda aman. Silakan muat ulang.</p>
            <button
              onClick={() => (reset ? reset() : window.location.reload())}
              style={{ background: "#123F6B", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer" }}
            >
              Muat ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
