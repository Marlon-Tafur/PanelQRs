import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQrStats } from "@/lib/qr/analytics";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    const stats = await getQrStats(id, { startDate, endDate });

    if (!stats) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVALID_RANGE") {
        return NextResponse.json(
          { error: "Rango de fechas inválido. Usa formato YYYY-MM-DD." },
          { status: 400 }
        );
      }

      if (err.message === "RANGE_TOO_LARGE") {
        return NextResponse.json(
          { error: "El rango no puede superar 90 días." },
          { status: 400 }
        );
      }
    }

    console.error("[GET /api/qrs/[id]/stats]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
