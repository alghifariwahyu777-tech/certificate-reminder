"use client";

import { useMemo, useState } from "react";
import { Save, RotateCcw, Copy, Eye, Code2, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  PLACEHOLDER_TOKENS,
  substitutePlaceholders,
  buildSimpleTemplateHtml,
  type SimpleTemplateFields,
} from "@/lib/email-template";

const SAMPLE_DATA = {
  certificateName: "ISO 9001:2015 Quality Management System",
  certificateNumber: "ISO-9001-2023-001",
  categoryName: "ISO",
  clientName: "PT Nusantara Pangan Sejahtera",
  pic: "Budi Santoso",
  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  daysRemaining: 14,
};

type Mode = "SIMPLE" | "ADVANCED";

export function EmailTemplateEditor({
  initialMode,
  initialSubject,
  initialSimpleFields,
  initialBodyHtml,
}: {
  initialMode: Mode;
  initialSubject: string;
  initialSimpleFields: SimpleTemplateFields;
  initialBodyHtml: string;
}) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [subject, setSubject] = useState(initialSubject);
  const [fields, setFields] = useState<SimpleTemplateFields>(initialSimpleFields);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function updateField<K extends keyof SimpleTemplateFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const previewHtml = useMemo(() => {
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
    try {
      return mode === "SIMPLE"
        ? buildSimpleTemplateHtml(fields, SAMPLE_DATA, browserOrigin)
        : substitutePlaceholders(bodyHtml, SAMPLE_DATA, browserOrigin);
    } catch {
      return "<p style='padding:20px;font-family:sans-serif;color:#b91c1c;'>Terjadi kesalahan saat menampilkan preview.</p>";
    }
  }, [mode, fields, bodyHtml]);

  const previewSubject = useMemo(() => substitutePlaceholders(subject, SAMPLE_DATA), [subject]);

  async function handleSave() {
    setServerError(null);
    setSaving(true);
    try {
      const payload =
        mode === "SIMPLE" ? { mode: "SIMPLE", subject, ...fields } : { mode: "ADVANCED", subject, bodyHtml };

      const res = await fetch("/api/email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body.message || "Gagal menyimpan template.");
        return;
      }
      showToast("Template email berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/email-template/reset", {
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
          buttonText: body.template.buttonText,
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
        {/* Mode switch */}
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 w-fit">
          <button
            onClick={() => setMode("SIMPLE")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              mode === "SIMPLE"
                ? "bg-ink text-white dark:bg-slate-100 dark:text-ink"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sederhana
          </button>
          <button
            onClick={() => setMode("ADVANCED")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              mode === "ADVANCED"
                ? "bg-ink text-white dark:bg-slate-100 dark:text-ink"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            Lanjutan (HTML)
          </button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{mode === "SIMPLE" ? "Isi Email" : "Edit HTML"}</CardTitle>
            <a
              href="/api/reminders/preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-light"
            >
              <Eye className="h-3.5 w-3.5" />
              Buka preview di tab baru
            </a>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subjek Email</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            {mode === "SIMPLE" ? (
              <>
                <div className="rounded border border-accent/20 bg-accent/5 px-3 py-2.5 flex gap-2">
                  <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Detail sertifikat (nama, nomor, kategori, klien, PIC, tanggal berakhir) otomatis
                    ditampilkan sebagai tabel rapi di tengah email — tidak perlu diatur di sini. Anda
                    hanya mengisi teks di sekitarnya.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Nama Perusahaan</Label>
                    <Input
                      id="companyName"
                      value={fields.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="systemName">Nama Sistem</Label>
                    <Input
                      id="systemName"
                      value={fields.systemName}
                      onChange={(e) => updateField("systemName", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="greeting">Salam Pembuka</Label>
                  <Input
                    id="greeting"
                    value={fields.greeting}
                    onChange={(e) => updateField("greeting", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="introText">Paragraf Pembuka</Label>
                  <Textarea
                    id="introText"
                    rows={3}
                    value={fields.introText}
                    onChange={(e) => updateField("introText", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="closingText">Paragraf Penutup (sebelum tombol)</Label>
                  <Textarea
                    id="closingText"
                    rows={2}
                    value={fields.closingText}
                    onChange={(e) => updateField("closingText", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="buttonText">Teks Tombol</Label>
                  <Input
                    id="buttonText"
                    value={fields.buttonText}
                    onChange={(e) => updateField("buttonText", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="footerText">Teks Footer</Label>
                  <Textarea
                    id="footerText"
                    rows={2}
                    value={fields.footerText}
                    onChange={(e) => updateField("footerText", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="bodyHtml">Isi Email (HTML)</Label>
                <Textarea
                  id="bodyHtml"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={22}
                  className="font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {serverError && (
              <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
                {serverError}
              </div>
            )}

            <div className="flex justify-between items-center pt-1">
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Reset ke Default
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
                <Save className="h-4 w-4" />
                Simpan Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placeholder yang Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-3">
              {mode === "SIMPLE"
                ? 'Opsional — bisa disisipkan di teks pembuka/penutup/footer di atas, mis. "Halo tim {{clientName}},".'
                : "Klik untuk menyalin, lalu tempel ke posisi yang diinginkan di dalam HTML."}
            </p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDER_TOKENS.map((t) => (
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
            <CardTitle>Preview (Data Contoh)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Subjek</p>
              <p className="text-sm text-ink font-medium">{previewSubject || "(kosong)"}</p>
            </div>
            <iframe title="Email preview" srcDoc={previewHtml} className="w-full h-[600px] border-0" sandbox="" />
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title="Reset Template">
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
            Reset ke Default
          </Button>
        </div>
      </Modal>
    </div>
  );
}
