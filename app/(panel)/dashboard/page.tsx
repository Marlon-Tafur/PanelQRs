import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/qr/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Metricas generales del panel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total QRs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(summary.totalQrs)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">QRs activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(summary.activeQrs)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">QRs pausados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(summary.pausedQrs)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escaneos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(summary.totalScans)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escaneos ultimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(summary.scansLast7Days)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 QRs por escaneos</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.topQrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no hay escaneos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QR</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Destino actual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Escaneos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topQrs.map((qr) => (
                  <TableRow key={qr.qrId}>
                    <TableCell className="font-medium">
                      <Link href={`/qrs/${qr.qrId}`} className="hover:underline">
                        {qr.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{qr.slug}</code>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span
                        className="block truncate text-sm text-muted-foreground"
                        title={qr.currentDestinationUrl ?? "-"}
                      >
                        {qr.currentDestinationUrl ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={qr.isActive ? "default" : "secondary"}>
                        {qr.isActive ? "Activo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatNumber(qr.scanCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
