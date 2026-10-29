"use client";

import { Segmented } from "@/components/ui/Segmented";
import { useMemo, useState } from "react";
import { Save, RotateCcw, Copy, Code2, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  PERSONNEL_PLACEHOLDER_TOKENS,
  substitutePersonnelPlaceholders,
  buildPersonnelSimpleTemplateHtml,
  type PersonnelSimpleTemplateFields,
} from "@/lib/personnel-email-template";
import { Notice } from "@/components/ui/Notice";

const SAMPLE_DATA = {
  employeeName: "Budi santoso",
  position: "Inspector",
  departmentName: "Divisi sertifikasi",
  certificationName: "Sertifikasi ahli K3 umum",
  certificationNumber: "K3U-2023-001",
  categoryName: "K3",
  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  daysRemaining: 14,
};

type Mode = "SIMPLE" | "ADVANCED";

export function PersonnelEmailTemplateEditor({
  initialMode,
  initialSubject,
  initialSimpleFields,
  initialBodyHtml,
}: {
  initialMode: Mode;
  initialSubject: string;
  initialSimpleFields: PersonnelSimpleTemplateFields;
  initialBodyHtml: string;
}) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [subject, setSubject] = useState(initialSubject);
  const [fields, setFields] = useState<PersonnelSimpleTemplateFields>(initialSimpleFields);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function updateField<K extends keyof PersonnelSimpleTemplateFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const previewHtml = useMemo(() => {
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
    try {
      return mode === "SIMPLE"
        ? buildPersonnelSimpleTemplateHtml(fields, SAMPLE_DATA, browserOrigin)
        : substitutePersonnelPlaceholders(bodyHtml, SAMPLE_DATA, browserOrigin);
    } catch {
      return "<p style='padding:20px;font-family:sans-serif;color:#b91c1c;'>Terjadi kesalahan saat menampilkan pratinjau.</p>";
    }
  }, [mode, fields, bodyHtml]);

  const previewSubject = useMemo(() => substitutePersonnelPlaceholders(subject, SAMPLE_DATA), [subject]);

  async function handleSave() {
    setServerError(null);
    setSaving(true);
    try {
      const payload =
        mode === "SIMPLE" ? { mode: "SIMPLE", subject, ...fields } : { mode: "ADVANCED", subject, bodyHtml };

      const res = await fetch("/api/personnel-email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body.message || "Gagal menyimpan template.");
        return;
      }
      showToast("Template email personil berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/personnel-email-template/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || "Gagal mereset template.", "error");
        return;
      }
      setSubject(body.template.subject);
      if (mode === "SIMPLE") {
        setFields({
          companyName: body.template.companyName,
          systemName: body.template.systemName,
          greeting: body.template.greeting,
          introText: body.template.introText,
          closingText: body.template.closingText,
          footerText: body.template.footerText,
        });
      } else {
        setBodyHtml(body.template.bodyHtml);
      }
      showToast("Template dikembalikan ke default.");
      setResetOpen(false);
    } finally {
      setResetting(false);
    }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token).then(() => showToast(`"${token}" disalin ke clipboard.`));
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            ["SIMPLE", "Sederhana"],
            ["ADVANCED", "Lanjutan (HTML)"],
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>{mode === "SIMPLE" ? "Isi email" : "Ubah HTML"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="p-subject">Subjek email</Label>
              <Input id="p-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            {mode === "SIMPLE" ? (
              <>
                <Notice tone="info">
                  <p>
                    Tabel data sertifikasi ditambahkan otomatis di tengah email. Anda cukup mengisi teks pembuka dan penutup. Email dikirim langsung ke personil yang bersangkutan.
                  </p>
                </Notice>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="p-companyName">Nama perusahaan</Label>
                    <Input
                      id="p-companyName"
                      value={fields.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-systemName">Nama sistem</Label>
                    <Input
                      id="p-systemName"
                      value={fields.systemName}
                      onChange={(e) => updateField("systemName", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="p-greeting">Salam pembuka</Label>
                  <Input
                    id="p-greeting"
                    value={fields.greeting}
                    onChange={(e) => updateField("greeting", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="p-introText">Paragraf pembuka</Label>
                  <Textarea
                    id="p-introText"
                    rows={3}
                    value={fields.introText}
                    onChange={(e) => updateField("introText", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="p-closingText">Paragraf penutup</Label>
                  <Textarea
                    id="p-closingText"
                    rows={2}
                    value={fields.closingText}
                    onChange={(e) => updateField("closingText", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="p-footerText">Teks penutup email</Label>
                  <Textarea
                    id="p-footerText"
                    rows={2}
                    value={fields.footerText}
                    onChange={(e) => updateField("footerText", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="p-bodyHtml">Isi email (HTML)</Label>
                <Textarea
                  id="p-bodyHtml"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={22}
                  className="font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {serverError && (
              <Notice tone="danger">
                {serverError}
              </Notice>
            )}

            <div className="flex justify-between items-center pt-1">
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Reset ke default
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                <Save className="h-4 w-4" />
                Simpan template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placeholder yang tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-3">
              {mode === "SIMPLE"
                ? 'Opsional, bisa disisipkan di teks pembuka/penutup/footer di atas, mis. "Halo {{employeeName}},".'
                : "Klik untuk menyalin, lalu tempel ke posisi yang diinginkan di dalam HTML."}
            </p>
            <div className="flex flex-wrap gap-2">
              {PERSONNEL_PLACEHOLDER_TOKENS.map((t) => (
                <button
                  key={t.token}
                  onClick={() => copyToken(t.token)}
                  title={t.label}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono text-ink hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-accent/40 transition-colors"
                >
                  <Copy className="h-3 w-3 text-slate-400" />
                  {t.token}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="xl:col-span-2">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Pratinjau (data contoh)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Subjek</p>
              <p className="text-sm text-ink font-medium">{previewSubject || "(kosong)"}</p>
            </div>
            <iframe title="Pratinjau email" srcDoc={previewHtml} className="w-full h-[600px] border-0" sandbox="" />
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title="Reset template">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Semua perubahan pada mode{" "}
          <strong>{mode === "SIMPLE" ? "Sederhana" : "Lanjutan (HTML)"}</strong> akan hilang dan
          dikembalikan ke desain bawaan sistem. Yakin ingin melanjutkan?
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={resetting} onClick={handleReset}>
            Reset ke default
          </Button>
        </div>
      </Modal>
    </div>
  );
}
