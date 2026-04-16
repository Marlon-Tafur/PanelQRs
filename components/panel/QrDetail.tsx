"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

        {/* Placeholder visual QR + redirección actual */}
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
              <CardTitle>Redirección actual</CardTitle>
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
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qr.redirectVersions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>v{version.versionNumber}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">
                    {version.destinationUrl}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
