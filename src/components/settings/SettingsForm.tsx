"use client";

import { useState } from "react";
import { Save, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Notice } from "@/components/ui/Notice";

export function SettingsForm({
  initialWhatsappNumber,
  canManage = true,
}: {
  initialWhatsappNumber: string;
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWhatsappNumber: whatsappNumber.replace(/\D/g, "") }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Gagal menyimpan pengaturan.");
        return;
      }
      showToast("Pengaturan berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontak WhatsApp Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="wa-number">Nomor WhatsApp</Label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="wa-number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="6281234567890"
              className="pl-9"
              disabled={!canManage}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tulis dengan kode negara, tanpa "+" dan spasi. Contoh: 081234567890 ditulis 6281234567890. Nomor ini dipakai tombol "Hubungi admin" di Portal Klien.
          </p>
        </div>

        {error && (
          <Notice tone="danger">
            {error}
          </Notice>
        )}

        {canManage && (
          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={saving}>
              <Save className="h-4 w-4" />
              Simpan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
