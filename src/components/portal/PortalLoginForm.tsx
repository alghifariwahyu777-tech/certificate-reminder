"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { startTopLoading } from "@/components/TopLoadingBar";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/portal/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.message || "Email atau password salah.");
      return;
    }

    const redirect = searchParams.get("redirect") || "/portal";
    startTopLoading();
    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="nama@perusahaananda.co.id"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/portal/forgot-password" className="text-xs text-accent hover:text-accent-light">
            Lupa password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>

      {serverError && (
        <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
          {serverError}
        </div>
      )}

      <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
        <LogIn className="h-4 w-4" />
        Masuk
      </Button>

      <p className="text-xs text-slate-400 text-center pt-2">
        Belum punya akun? Hubungi PIC Anda di PT Sucofindo (Persero) untuk didaftarkan.
      </p>
    </form>
  );
}
