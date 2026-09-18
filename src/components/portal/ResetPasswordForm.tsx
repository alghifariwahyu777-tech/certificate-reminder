"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Tautan tidak valid — token tidak ditemukan.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Gagal reset password.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/portal/login"), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-signal-expired">
          Tautan reset password tidak valid. Silakan minta tautan baru.
        </p>
        <Link href="/portal/forgot-password" className="text-sm text-accent hover:text-accent-light">
          Minta Tautan Baru
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-signal-active font-medium">Password berhasil diubah!</p>
        <p className="text-sm text-slate-500">Mengarahkan ke halaman login...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1.5">
        <KeyRound className="h-5 w-5 text-accent" />
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">Buat Password Baru</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">Masukkan password baru untuk akun Client Portal Anda.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reset-new-password">Password Baru</Label>
          <Input
            id="reset-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400 mt-1">Minimal 8 karakter.</p>
        </div>
        <div>
          <Label htmlFor="reset-confirm-password">Konfirmasi Password</Label>
          <Input
            id="reset-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
            {error}
          </div>
        )}

        <Button type="submit" isLoading={loading} className="w-full">
          Simpan Password Baru
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
  );
}
