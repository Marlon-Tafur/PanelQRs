"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RedirectVersion = {
  destinationUrl: string;
  versionNumber: number;
};

type QrWithRelations = {
  id: string;
  name: string;
  slug: string;
  shortUrl: string;
  isActive: boolean;
  description: string | null;
  primaryColor: string;
  backgroundColor: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  redirectVersions: RedirectVersion[];
  _count: { scanLogs: number };
};

type Props = {
  initialQrs: QrWithRelations[];
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9-]{4,40}$/i.test(value);
}

export function QrList({ initialQrs }: Props) {
  const router = useRouter();
  const [qrs, setQrs] = useState<QrWithRelations[]>(initialQrs);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const filtered = qrs.filter((qr) =>
    qr.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    const trimmedName = formName.trim();
    const trimmedUrl = formUrl.trim();

    if (trimmedName.length < 2) {
      setFormError("El nombre debe tener al menos 2 caracteres.");
      setCreating(false);
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setFormError("La URL debe iniciar con http:// o https://.");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/qrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          destinationUrl: trimmedUrl,
          description: formDescription || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Error al crear el QR");
        return;
      }

      setDialogOpen(false);
      setFormName("");
      setFormUrl("");
      setFormDescription("");
      router.refresh();

      // Recargar lista desde API
      const listRes = await fetch("/api/qrs");
      if (listRes.ok) {
        const updated = await listRes.json();
        setQrs(updated);
      }
    } catch {
      setFormError("Error de red. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(qr: QrWithRelations) {
    try {
      const res = await fetch(`/api/qrs/${qr.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !qr.isActive }),
      });

      if (!res.ok) return;

      router.refresh();
      setQrs((prev) =>
        prev.map((q) => (q.id === qr.id ? { ...q, isActive: !q.isActive } : q))
      );
    } catch {
      // silencioso
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mis QRs</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            Nuevo QR
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo QR</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="qr-name">Nombre *</Label>
                <Input
                  id="qr-name"
                  placeholder="Ej: QR Stand Feria 2024"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qr-url">URL de destino *</Label>
                <Input
                  id="qr-url"
                  type="url"
                  placeholder="https://ejemplo.com"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qr-description">Descripción (opcional)</Label>
                <Textarea
                  id="qr-description"
                  placeholder="Descripción del QR..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creando..." : "Crear QR"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No hay QRs que coincidan con la búsqueda." : "No hay QRs todavía. ¡Creá el primero!"}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Destino actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Escaneos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((qr) => {
              const current = qr.redirectVersions[0];
              return (
                <TableRow key={qr.id}>
                  <TableCell className="font-medium">{qr.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {qr.slug}
                    </code>
                    {!isValidSlug(qr.slug) && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Slug fuera de formato esperado
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {current?.destinationUrl ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={qr.isActive ? "default" : "secondary"}>
                      {qr.isActive ? "Activo" : "Pausado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {qr._count.scanLogs}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/qrs/${qr.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Ver
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(qr)}
                      >
                        {qr.isActive ? "Pausar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
