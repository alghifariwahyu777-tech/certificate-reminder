"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Building2, Mail, Phone, MapPin, User, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { clientSchema, type ClientInput } from "@/lib/validations";
import { ClientPortalUsersModal } from "@/components/client/ClientPortalUsersModal";

type ClientItem = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  certificateCount: number;
};

export function ClientManager({
  initialClients,
  canManage = true,
}: {
  initialClients: ClientItem[];
  canManage?: boolean;
}) {
  const { showToast } = useToast();
  const [clients, setClients] = useState(initialClients);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientItem | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null);
  const [portalUsersTarget, setPortalUsersTarget] = useState<ClientItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({ resolver: zodResolver(clientSchema) });

  function openAdd() {
    setEditTarget(null);
    setServerError(null);
    reset({ name: "", contactPerson: "", email: "", phone: "", address: "" });
    setFormOpen(true);
  }

  function openEdit(client: ClientItem) {
    setEditTarget(client);
    setServerError(null);
    reset({
      name: client.name,
      contactPerson: client.contactPerson || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
    });
    setFormOpen(true);
  }

  async function onSubmit(data: ClientInput) {
    setServerError(null);
    const isEdit = !!editTarget;
    const res = await fetch(isEdit ? `/api/clients/${editTarget!.id}` : "/api/clients", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(body.message || "Gagal menyimpan klien.");
      return;
    }

    if (isEdit) {
      setClients((prev) =>
        prev
          .map((c) => (c.id === editTarget!.id ? { ...c, ...body.client } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Data klien berhasil diperbarui.");
    } else {
      setClients((prev) =>
        [...prev, { ...body.client, certificateCount: 0 }].sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast("Klien berhasil ditambahkan.");
    }
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(body.message || "Gagal menghapus klien.");
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast("Klien berhasil dihapus.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{clients.length} klien terdaftar</p>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Klien
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clients.length === 0 && (
          <Card className="sm:col-span-2">
            <p className="px-5 py-10 text-center text-sm text-slate-400">Belum ada klien terdaftar.</p>
          </Card>
        )}
        {clients.map((client) => (
          <Card key={client.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded bg-ink/5 text-ink flex items-center justify-center border border-ink/10 shrink-0">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{client.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {client.certificateCount} sertifikat
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPortalUsersTarget(client)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Kelola akun portal"
                    title="Akun Portal"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(client)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-accent"
                    aria-label="Edit klien"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(client);
                      setDeleteError(null);
                    }}
                    className="p-1.5 rounded hover:bg-signal-expiredBg text-slate-500 hover:text-signal-expired"
                    aria-label="Hapus klien"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {(client.contactPerson || client.email || client.phone || client.address) && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                {client.contactPerson && (
                  <p className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> {client.contactPerson}
                  </p>
                )}
                {client.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {client.phone}
                  </p>
                )}
                {client.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {client.address}
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Edit Klien" : "Tambah Klien"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="client-name">Nama Perusahaan</Label>
            <Input id="client-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div>
            <Label htmlFor="client-contact">Contact Person</Label>
            <Input id="client-contact" error={errors.contactPerson?.message} {...register("contactPerson")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" error={errors.email?.message} {...register("email")} />
            </div>
            <div>
              <Label htmlFor="client-phone">Telepon</Label>
              <Input id="client-phone" error={errors.phone?.message} {...register("phone")} />
            </div>
          </div>
          <div>
            <Label htmlFor="client-address">Alamat</Label>
            <Textarea id="client-address" rows={2} error={errors.address?.message} {...register("address")} />
          </div>

          {serverError && (
            <div className="rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Klien">
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus klien <strong className="text-ink">{deleteTarget?.name}</strong>?
        </p>
        {deleteError && (
          <div className="mt-3 rounded border border-signal-expiredBorder bg-signal-expiredBg px-3 py-2 text-sm text-signal-expired">
            {deleteError}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
            Hapus
          </Button>
        </div>
      </Modal>

      {portalUsersTarget && (
        <ClientPortalUsersModal
          clientId={portalUsersTarget.id}
          clientName={portalUsersTarget.name}
          isOpen={!!portalUsersTarget}
          onClose={() => setPortalUsersTarget(null)}
        />
      )}
    </div>
  );
}
