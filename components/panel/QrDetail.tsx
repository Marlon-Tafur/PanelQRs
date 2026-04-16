"use client";

import { useEffect, useMemo, useState } from "react";
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

type QrStatsResponse = {
  qrId: string;
  range: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalScansAllTime: number;
  totalScansInRange: number;
  scansByVersion: Array<{
    redirectVersionId: string;
    versionNumber: number;
    destinationUrl: string;
    isCurrent: boolean;
    startedAt: string;
    endedAt: string | null;
    scanCount: number;
  }>;
  scansByDate: Array<{
    date: string;
    scanCount: number;
  }>;
};

type Props = {
  qr: QrWithVersions;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value);
}

export function QrDetail({ qr: initialQr }: Props) {
  const router = useRouter();
  const [qr, setQr] = useState<QrWithVersions>(initialQr);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dialog de cambio de redireccion
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [savingRedirect, setSavingRedirect] = useState(false);

  // Analitica por rango
  const defaultEndDate = toInputDate(new Date());
  const defaultStartDate = toInputDate(addDays(new Date(), -29));

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [stats, setStats] = useState<QrStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const currentVersion = qr.redirectVersions.find((v) => v.isCurrent);

  const maxScanCountByDay = useMemo(() => {
    if (!stats || stats.scansByDate.length === 0) return 1;
    return Math.max(...stats.scansByDate.map((day) => day.scanCount), 1);
  }, [stats]);

  useEffect(() => {
    setQr(initialQr);
  }, [initialQr]);

  async function fetchStats(nextStart: string, nextEnd: string) {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const params = new URLSearchParams({ startDate: nextStart, endDate: nextEnd });
      const res = await fetch(`/api/qrs/${qr.id}/stats?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        setStatsError(data.error ?? "No se pudieron cargar las metricas");
        return;
      }

      const data: QrStatsResponse = await res.json();
      setStats(data);
    } catch {
      setStatsError("Error de red al cargar metricas");
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    void fetchStats(defaultStartDate, defaultEndDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr.id]);

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
      setRedirectError("Error de red. Intenta de nuevo.");
    } finally {
      setSavingRedirect(false);
    }
  }

  async function handleApplyDateRange(e: React.FormEvent) {
    e.preventDefault();

    if (!startDate || !endDate) {
      setStatsError("Selecciona una fecha de inicio y fin");
      return;
    }

    if (startDate > endDate) {
      setStatsError("La fecha de inicio no puede ser mayor a la fecha fin");
      return;
    }

    await fetchStats(startDate, endDate);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/qrs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {"<- Volver"}
        </Link>
        <h1 className="text-2xl font-bold">{qr.name}</h1>
        <Badge variant={qr.isActive ? "default" : "secondary"}>
          {qr.isActive ? "Activo" : "Pausado"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <p className="text-sm text-muted-foreground">Descripcion</p>
                <p>{qr.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">{qr.slug}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">URL corta</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{qr.shortUrl}</code>
                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de escaneos</p>
              <p className="text-2xl font-bold">{formatNumber(qr._count.scanLogs)}</p>
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
                <CardTitle>Redireccion actual</CardTitle>
                <Dialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                      setNewUrl("");
                      setChangeNote("");
                      setRedirectError(null);
                    }
                  }}
                >
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
                          Nota del cambio <span className="text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <Textarea
                          id="change-note"
                          placeholder="Ej: Campana verano 2026"
                          value={changeNote}
                          onChange={(e) => setChangeNote(e.target.value)}
                          disabled={savingRedirect}
                        />
                      </div>
                      {redirectError && <p className="text-sm text-destructive">{redirectError}</p>}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleChangeRedirect} disabled={savingRedirect || !newUrl.trim()}>
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
                  <p className="text-sm text-muted-foreground">Version {currentVersion.versionNumber}</p>
                  <p className="text-sm break-all font-medium">{currentVersion.destinationUrl}</p>
                  <p className="text-xs text-muted-foreground">Desde {formatDate(currentVersion.startedAt)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin version activa.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analitica de escaneos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleApplyDateRange} className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Desde</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">Hasta</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            <Button type="submit" variant="outline" disabled={statsLoading}>
              {statsLoading ? "Cargando..." : "Aplicar filtro"}
            </Button>
            <p className="text-xs text-muted-foreground md:ml-auto">Rango maximo permitido: 90 dias</p>
          </form>

          {statsError && <p className="text-sm text-destructive">{statsError}</p>}

          {stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Escaneos en rango
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatNumber(stats.totalScansInRange)}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.range.startDate} a {stats.range.endDate}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Escaneos historicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatNumber(stats.totalScansAllTime)}</p>
                    <p className="text-xs text-muted-foreground">Todos los registros del QR</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Escaneos por version (rango seleccionado)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-right">Escaneos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.scansByVersion.map((version) => (
                      <TableRow key={version.redirectVersionId}>
                        <TableCell>v{version.versionNumber}</TableCell>
                        <TableCell>
                          <Badge variant={version.isCurrent ? "default" : "secondary"}>
                            {version.isCurrent ? "Actual" : "Anterior"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="block truncate text-sm" title={version.destinationUrl}>
                            {version.destinationUrl}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(version.scanCount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Escaneos por fecha</h3>
                {stats.scansByDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos para el rango seleccionado.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <div className="h-52 min-w-[720px] flex items-end gap-1 border rounded-md p-3 bg-muted/20">
                        {stats.scansByDate.map((point, index) => {
                          const height = Math.max((point.scanCount / maxScanCountByDay) * 100, point.scanCount > 0 ? 5 : 2);
                          const showLabel =
                            index === 0 ||
                            index === stats.scansByDate.length - 1 ||
                            index % 7 === 0;

                          return (
                            <div key={point.date} className="flex-1 min-w-[14px] flex flex-col items-center justify-end gap-1">
                              <div
                                className="w-full rounded-sm bg-primary/80 hover:bg-primary"
                                style={{ height: `${height}%` }}
                                title={`${point.date}: ${point.scanCount} escaneos`}
                              />
                              <span className="text-[10px] text-muted-foreground h-3 leading-none">
                                {showLabel ? formatShortDate(point.date) : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximo diario en rango: {formatNumber(maxScanCountByDay)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de redirecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
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
                <TableRow key={version.id} className={cn(version.isCurrent && "bg-muted/40")}>
                  <TableCell>v{version.versionNumber}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="block truncate text-sm" title={version.destinationUrl}>
                      {version.destinationUrl}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                    <span className="block truncate" title={version.changeNote ?? ""}>
                      {version.changeNote ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={version.isCurrent ? "default" : "secondary"}>
                      {version.isCurrent ? "Actual" : "Anterior"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(version.startedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {version.endedAt ? formatDate(version.endedAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatNumber(version._count.scanLogs)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
