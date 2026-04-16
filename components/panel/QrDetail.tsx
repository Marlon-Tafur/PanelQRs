"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RedirectVersion = {
  id: string;
  versionNumber: number;
  destinationUrl: string;
  isCurrent: boolean;
  startedAt: Date | string;
  endedAt: Date | string | null;
  changeNote: string | null;
  _count: { scanLogs: number };
};

type QrWithVersions = {
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
  qr: QrWithVersions;
};

export function QrDetail({ qr: initialQr }: Props) {
  const router = useRouter();
  const [qr, setQr] = useState<QrWithVersions>(initialQr);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estado del Dialog de cambio de redirección
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [savingRedirect, setSavingRedirect] = useState(false);

  const currentVersion = qr.redirectVersions.find((v) => v.isCurrent);

  async function handleToggleStatus() {
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/qrs/${qr.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !qr.isActive }),
      });

      if (res.ok) {
        setQr((prev) => ({ ...prev, isActive: !prev.isActive }));
        router.refresh();
      }
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(qr.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleChangeRedirect() {
    setRedirectError(null);
    setSavingRedirect(true);
    try {
      const res = await fetch(`/api/qrs/${qr.id}/redirect-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: newUrl.trim(),
          changeNote: changeNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setNewUrl("");
        setChangeNote("");
        router.refresh();
      } else {
        const data = await res.json();
        setRedirectError(data.error ?? "Error al guardar el cambio");
      }
    } catch {
      setRedirectError("Error de red. Intentá de nuevo.");
    } finally {
      setSavingRedirect(false);
    }
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/qrs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold">{qr.name}</h1>
        <Badge variant={qr.isActive ? "default" : "secondary"}>
          {qr.isActive ? "Activo" : "Pausado"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos del QR */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{qr.name}</p>
            </div>
            {qr.description && (
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p>{qr.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {qr.slug}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">URL corta</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">
                  {qr.shortUrl}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de escaneos</p>
              <p className="text-2xl font-bold">{qr._count.scanLogs}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Estado</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
              >
                {togglingStatus
                  ? "Actualizando..."
                  : qr.isActive
                  ? "Pausar QR"
                  : "Activar QR"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Imagen QR + redirección actual */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imagen QR</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center px-4">
                  QR visual
                  <br />
                  disponible en Fase 6
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Redirección actual</CardTitle>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setNewUrl("");
                    setChangeNote("");
                    setRedirectError(null);
                  }
                }}>
                  <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    Cambiar destino
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cambiar destino del QR</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-url">Nueva URL de destino</Label>
                        <Input
                          id="new-url"
                          type="url"
                          placeholder="https://ejemplo.com/nueva-pagina"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          disabled={savingRedirect}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="change-note">
                          Nota del cambio{" "}
                          <span className="text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <Textarea
                          id="change-note"
                          placeholder="Ej: Campaña de verano 2026"
                          value={changeNote}
                          onChange={(e) => setChangeNote(e.target.value)}
                          disabled={savingRedirect}
                        />
                      </div>
                      {redirectError && (
                        <p className="text-sm text-destructive">{redirectError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleChangeRedirect}
                        disabled={savingRedirect || !newUrl.trim()}
                      >
                        {savingRedirect ? "Guardando..." : "Guardar cambio"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {currentVersion ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Versión {currentVersion.versionNumber}
                  </p>
                  <p className="text-sm break-all font-medium">
                    {currentVersion.destinationUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatDate(currentVersion.startedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin versión activa.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de versiones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de redirecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>URL de destino</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="text-right">Escaneos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qr.redirectVersions.map((version) => (
                <TableRow
                  key={version.id}
                  className={cn(version.isCurrent && "bg-muted/40")}
                >
                  <TableCell>v{version.versionNumber}</TableCell>
                  <TableCell className="max-w-xs">
                    <span
                      className="block truncate text-sm"
                      title={version.destinationUrl}
                    >
                      {version.destinationUrl}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                    <span className="block truncate" title={version.changeNote ?? ""}>
                      {version.changeNote ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={version.isCurrent ? "default" : "secondary"}
                    >
                      {version.isCurrent ? "Actual" : "Anterior"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(version.startedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {version.endedAt ? formatDate(version.endedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {version._count.scanLogs}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
