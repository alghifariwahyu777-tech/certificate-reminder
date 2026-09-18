"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SucofindoLogo } from "@/components/brand/SucofindoLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Terjadi kesalahan.");
        return;
      }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <SucofindoLogo height={40} className="mb-2" />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-blue dark:text-brand-teal">
            Ensuring Quality, Protecting Trust
          </span>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">
              Cek Email Anda
            </h1>
            <p className="text-sm text-slate-500">
              Jika email <strong>{email}</strong> terdaftar, kami sudah mengirimkan tautan untuk
              membuat password baru. Tautan berlaku selama 60 menit.
            </p>
            <Link href="/portal/login" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-light">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100 mb-1.5">
              Lupa Password
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Masukkan email akun Client Portal Anda, kami akan kirimkan tautan reset password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    placeholder="nama@perusahaananda.co.id"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={loading} className="w-full">
                Kirim Tautan Reset
              </Button>
            </form>

            <Link
              href="/portal/login"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
