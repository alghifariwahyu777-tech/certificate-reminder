"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { applicationSchema, type ApplicationInput } from "@/lib/validations";
import { Send } from "lucide-react";

type ServiceOption = { id: string; name: string; code: string };

export function NewApplicationForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { serviceId: services[0]?.id || "" },
  });

  async function onSubmit(data: ApplicationInput) {
    setServerError(null);
    const res = await fetch("/api/portal/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal membuat permohonan.");
      return;
    }
    router.push(`/portal/applications/${body.application.id}`);
  }

  if (services.length === 0) {
    return (
      <Card>
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          Belum ada layanan yang tersedia untuk diajukan saat ini.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="app-service">Layanan Sertifikasi</Label>
            <Select id="app-service" {...register("serviceId")}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app-contact-name">Nama Kontak</Label>
              <Input id="app-contact-name" error={errors.contactName?.message} {...register("contactName")} />
            </div>
            <div>
              <Label htmlFor="app-contact-position">Jabatan</Label>
              <Input id="app-contact-position" {...register("contactPosition")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app-contact-email">Email PIC</Label>
              <Input
                id="app-contact-email"
                type="email"
                error={errors.contactEmail?.message}
                {...register("contactEmail")}
              />
              <p className="text-xs text-slate-400 mt-1">
                Reminder masa berlaku sertifikat akan dikirim ke email ini.
              </p>
            </div>
            <div>
              <Label htmlFor="app-contact-phone">Telepon Kontak</Label>
              <Input id="app-contact-phone" {...register("contactPhone")} />
            </div>
          </div>

          <div>
            <Label htmlFor="app-desc">Catatan Tambahan (opsional)</Label>
            <Textarea id="app-desc" rows={3} {...register("description")} />
          </div>

          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting}>
            <Send className="h-4 w-4" />
            Lanjutkan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
